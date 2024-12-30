/* Don't use sloppy JS. */ "use strict";

// Browser Abstraction Layer :-)
export const BAL = {
  create_image: async function (path) {
    let img;
    await new Promise(resolve => {
      img = new Image();
      img.onload = resolve;
      img.src = path;
    });
    return img;
  },
  add_document_event_listeners: function (event_mappings) {
    for (const ev of event_mappings) {
      document.addEventListener(ev.name, ev.handler)
    }
  },
  add_event_listeners: function (element, event_mappings) {
    for (const ev of event_mappings) {
      element.addEventListener(ev.name, ev.handler)
    }
  },
  schedule_ticker(handler, data) {
    let game_loop = function (ts) {
      handler(ts, data)
      window.requestAnimationFrame(game_loop);
    }
    window.requestAnimationFrame(game_loop)
  }
}
