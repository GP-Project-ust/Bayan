(()=>{"use strict";var e,t={8800(e,t,r){r(5564);var o=r(7130),a=r(1743),n=r(1927),i=r(5087);r(3894),r(996);Object.defineProperty(s,"name",{value:"default",configurable:!0});const l=["enable_browsec_only_for_selected_sites","enable_browsec_for_all_sites_excluding_selected_sites","use_different_locations_for_different_sites"];function s(){const e="ru"===(0,a.A)()?"ru":"en";return n.qy`
    <style>
      ${i.A}
      .Intro { margin-bottom: 40px; }
      .Prompt { font-size: 14px; color: var(--text-dim); margin-bottom: 8px; }
      details { border-bottom: 1px solid var(--line); }
      summary { display: flex; align-items: center; gap: 16px; padding: 22px 0; cursor: pointer; list-style: none; font-size: 18px; font-weight: 500; line-height: 1.5; }
      summary::-webkit-details-marker { display: none; }
      summary::after { content: ''; width: 8px; height: 8px; flex-shrink: 0; margin: 0 5px 0 auto; border: solid var(--text-dim); border-width: 0 1.5px 1.5px 0; transform: rotate(45deg); }
      details[open] summary::after { transform: rotate(225deg); }
      .Content { display: grid; grid-template-columns: minmax(0, 1fr) 402px; align-items: start; gap: 40px; padding: 8px 0 32px; }
      ol { margin: 0; padding: 0 0 0 24px; }
      li { padding-left: 8px; margin-bottom: 20px; }
      li::marker { color: var(--accent); font-weight: 500; }
      .Note { color: var(--text-dim); font-size: 13px; margin-top: 24px; max-width: 680px; }
      @media (max-width: 820px) { .Content { grid-template-columns: minmax(0, 1fr); gap: 20px; } tutorial-player { max-width: 402px; } }
    </style>
    <tab-header></tab-header>
    <main class="Page">
      <header class="Intro"><h1>${(0,o.Ay)("how_to_use_smart_settings")}</h1></header>
      <p class="Prompt">${(0,o.Ay)("i_want_to")}</p>
      ${l.map(((t,r)=>n.qy`
        <details @toggle="${this.toggleSection}">
          <summary>${(0,o.Ay)(t)}</summary>
          <div class="Content">
            <ol>${[1,2,3].map((e=>n.qy`<li>${(0,o.Ay)(`${t}_description_${e}`)}</li>`))}</ol>
            <tutorial-player asset="smart-${r+1}-${e}" label="${(0,o.Ay)(t)}"></tutorial-player>
          </div>
        </details>`))}
      <p class="Note">${(0,o.Ay)("smart_guide_plan_note")}</p>
      <p class="Note">${(0,o.Ay)("smart_guide_shortcut_note")}</p>
    </main>`}class d extends n.WF{render(){return s.call(this)}toggleSection(e){var t;const r=e.currentTarget;var o,a,n;r.open?null===(t=this.shadowRoot)||void 0===t||t.querySelectorAll("details").forEach((e=>{var t,o,a;e!==r&&(e.open=!1,null===(t=e.querySelector("tutorial-player"))||void 0===t||null===(o=t.shadowRoot)||void 0===o||null===(a=o.querySelector("video"))||void 0===a||a.pause())})):null===(o=r.querySelector("tutorial-player"))||void 0===o||null===(a=o.shadowRoot)||void 0===a||null===(n=a.querySelector("video"))||void 0===n||n.pause()}}customElements.define("main-block",d);document.title=(0,o.Ay)("how_to_use_smart_settings"),(async()=>{const e=(0,a.A)();window.language=e,document.documentElement.lang=e,document.body.prepend(document.createElement("main-block"))})()}},r={};function o(e){var a=r[e];if(void 0!==a)return a.exports;var n=r[e]={id:e,loaded:!1,exports:{}};return t[e].call(n.exports,n,n.exports,o),n.loaded=!0,n.exports}o.m=t,e=[],o.O=(t,r,a,n)=>{if(!r){var i=1/0;for(p=0;p<e.length;p++){for(var[r,a,n]=e[p],l=!0,s=0;s<r.length;s++)(!1&n||i>=n)&&Object.keys(o.O).every((e=>o.O[e](r[s])))?r.splice(s--,1):(l=!1,n<i&&(i=n));if(l){e.splice(p--,1);var d=a();void 0!==d&&(t=d)}}return t}n=n||0;for(var p=e.length;p>0&&e[p-1][2]>n;p--)e[p]=e[p-1];e[p]=[r,a,n]},o.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return o.d(t,{a:t}),t},o.d=(e,t)=>{for(var r in t)o.o(t,r)&&!o.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},o.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),o.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),o.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.nmd=e=>(e.paths=[],e.children||(e.children=[]),e),o.j=22,(()=>{var e={22:0};o.O.j=t=>0===e[t];var t=(t,r)=>{var a,n,[i,l,s]=r,d=0;if(i.some((t=>0!==e[t]))){for(a in l)o.o(l,a)&&(o.m[a]=l[a]);if(s)var p=s(o)}for(t&&t(r);d<i.length;d++)n=i[d],o.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return o.O(p)},r=self.webpackChunkbrowsec_extension=self.webpackChunkbrowsec_extension||[];r.forEach(t.bind(null,0)),r.push=t.bind(null,r.push.bind(r))})();var a=o.O(void 0,[76],(()=>o(8800)));a=o.O(a)})();