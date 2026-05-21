// TODO: Embeddable widget
// People paste a <script> tag on their site and this renders a floating habit widget

(function() {
  const WIDGET_URL = 'https://your-app.com'

  function createWidget() {
    const iframe = document.createElement('iframe')
    iframe.src    = `${WIDGET_URL}/widget`
    iframe.style  = 'position:fixed;bottom:20px;right:20px;width:300px;height:400px;border:none;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,0.12);z-index:9999'
    document.body.appendChild(iframe)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createWidget)
  } else {
    createWidget()
  }
})()
