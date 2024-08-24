function updateTime() {
    const currentTimeElement = document.getElementById('currentTime');
    const now = new Date();
    const options = { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const timeString = now.toLocaleTimeString('en-US', options);
    currentTimeElement.textContent = `Current Time (IST): ${timeString}`;
}

// Update the time every second
setInterval(updateTime, 1000);

// Initial call to display the time immediately on page load
updateTime();