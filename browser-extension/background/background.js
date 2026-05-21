// TODO: Handle push notifications and alarms
// Runs as a service worker in the background

chrome.alarms.onAlarm.addListener((alarm) => {
  // TODO: show notification when habit reminder fires
  chrome.notifications.create({
    type: 'basic',
    title: 'Habit Reminder',
    message: `Time to do: ${alarm.name}`,
    iconUrl: '../icons/icon48.png'
  })
})
