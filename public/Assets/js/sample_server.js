const express = require("express");
const path = require("path");
var app = express();
var server = app.listen(process.env.PORT || 3000, function(){
    console.log("Listening on Port 3000");
});
const fs = require("fs");
const fileUpload = require("express-fileupload");
const { connect } = require("http2");

const io = require("socket.io")(server, {
    allowEIO3: true // false by default
});

app.use(express.static(path.join(__dirname,"")));

var userConnections = [];
var hostInfo = [];
io.on("connection", (socket) => {
    console.log("socket id is ", socket.id);
    async function userConnect(data){

        const existingUser = userConnections.find(
            (p) => p.meeting_id == data.meetingids && p.connectionId == data.connectionIds
        )
        if(!existingUser){
            userConnections.push({
                connectionId: data.connectionIds,
                user_id: data.displayNames,
                meeting_id: data.meetingids,
            });
        }
        var other_users = userConnections.filter(
            (p) => p.meeting_id == data.meetingid && p.connectionId != data.connectionIds
        );

        userConnections.push({
            connectionId: socket.id,
            user_id: data.displayName,
            meeting_id: data.meetingid,
        });
var userCount = userConnections.length;
console.log(userCount);
socket.to("data.connectionIds").emit("inform_me_about_other_user", other_users.map(user => ({
    user_id: user.user_id,
    connId: user.connectionId
})));
        other_users.forEach((v) => {
            try{
                io.to(v.connectionId).emit("inform_others_about_me", {
                    other_user_id: data.displayNames,
                    connId: data.connectionIds,
                    userNumber: userCount,
                });
            }
            catch(e){
                console.log(e);
            }
            
        });

        // Emit the correct structure for other users
  
    }
    socket.on("askToConnect", (data) => {
        const isMeetingExist = userConnections.find((info) => info.meeting_id  === data.meetingid);
        if(isMeetingExist){
            const isHostForMeeting = hostInfo.find((info) => info.meeting_id === data.meetingid);
            socket.to(isHostForMeeting.connectionId).emit("request_join_permission", {
            displayNames: data.displayName,
            meetingids: data.meetingid,
            connectionIds: socket.id,
            });
            
        } else{
           hostInfo.push({
            connectionId: socket.id,
            user_id: data.displayName,
            meeting_id: data.meetingid,
            host:true,
           })
           var datt = {
            displayNames: data.displayName,
            meetingids: data.meetingid,
            connectionIds: socket.id,
            host:true,
           };
           try{
            userConnect(datt);
            }
            catch(e){
                console.log(e);
            }
        }
        
        
    });
    socket.on("grant_join_permission", (dat) =>{
        if(dat.permissionGranted){
          userConnect(dat.data);
        }
        else{
           socket.to(dat.data.connectionId).emit("permission_denied");
           socket.disconnect();
        }
    });

    socket.on("SDPProcess", (data) => {
        socket.to(data.to_connid).emit("SDPProcess", {
            message: data.message,
            from_connid: socket.id,
        });
    });
    socket.on("sendMessage", (msg) =>{
        console.log(msg);
        var mUser = userConnections.find((p) => p.connectionId == socket.id);
        if(mUser){
            var meetingid = mUser.meeting_id;
            var from = mUser.user_id;
            var list = userConnections.filter((p) => p.meeting_id == meetingid);
            list.forEach((v) => {
                socket.to(v.connectionId).emit("showChatMessage", {
                    
                    from: from,
                    message: msg,
                });
            });
        }
    });
    socket.on("fileTransferToOther", (msg) => {
        console.log(msg);
        var mUser = userConnections.find((p) => p.connectionId == socket.id);
        if (mUser) {
          var meetingid = mUser.meeting_id;
          var from = mUser.user_id;
          var list = userConnections.filter((p) => p.meeting_id == meetingid);
          list.forEach((v) => {
            socket.to(v.connectionId).emit("showFileMessage", {
              username: msg.username,
              meetingid: msg.meetingid,
              filePath: msg.filePath,
              fileName: msg.fileName,
            });
          });
        }
      });
    socket.on("disconnect", function(){
        console.log("User got disconnected");
        var disUser = userConnections.find((p) => p.connectionId == socket.id);
        if(disUser){
            var meetingid = disUser.meeting_id;
            userConnections = userConnections.filter((p) => p.connectionId!=socket.id);
            var list = userConnections.filter((p)=>p.meeting_id == meetingid);

            list.forEach((v) => {
                var userNumberAfUserLeave = userConnections.length;
                socket.to(v.connectionId).emit("inform_others_about_disconnected_user", {
                    connId: socket.id,
                    uNumber: userNumberAfUserLeave
                    
                });
            });
        }
    });

    socket.on("sendHandRaise", function (data) {
        var senderInfo = userConnections.find((p) => p.connectionId == socket.id);
        console.log("senderInfo :", senderInfo);
        if (senderInfo) {
          var meetingid = senderInfo.meeting_id;
          // userConnections = userConnections.filter(
          //   (p) => p.connectionId != socket.id
          // );
          var list = userConnections.filter((p) => p.meeting_id == meetingid);
          list.forEach((v) => {
            var userNumberAfUserLeave = userConnections.length;
            socket.to(v.connectionId).emit("HandRaise_info_for_others", {
              connId: socket.id,
              handRaise: data,
            });
          });
        }
      });
});


app.use(fileUpload());
app.post("/attachimg", function(req, res){
    var data = req.body;
    var imageFile = req.files.zipfile;
    console.log(imageFile);
    var dir = "public/attachment/" + data.meeting_id + "/";
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      imageFile.mv(
        "public/attachment/" + data.meeting_id + "/" + imageFile.name,
        function (error) {
          if (error) {
            console.log("couldn't upload the image file , error: ", error);
          } else {
            console.log("Image file successfully uploaded");
          }
        }
      );  
})