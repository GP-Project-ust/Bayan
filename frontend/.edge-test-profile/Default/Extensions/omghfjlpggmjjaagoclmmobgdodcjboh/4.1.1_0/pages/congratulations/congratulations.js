(()=>{"use strict";var e,t={490(e,t,n){n(5564);var r=n(7130),o=n(1743),i=n(1927),a=n(392),l=n(8085);const{userAgent:s}=navigator,c=(0,l.F2)()&&s.includes("Chrome")&&["Edg","Edge"].every((e=>!s.includes(e)));let p;if(c)try{p=Number(s.match(/Chrome\/\d+/)[0].split("/")[1])}catch(e){}const d=Boolean(c&&p&&p>=84);var u=n(5087);n(3894),n(996);function g(){a.A.track("congrats_tab_tgclick")}function h(){const e="ru"===(0,o.A)()?"ru":"en",t="ru"===e?"https://t.me/BrowsecVPNru":"https://t.me/BrowsecVPNofficial";return i.qy`
    <style>
      ${u.A}
      .Page { display: grid; grid-template-columns: minmax(0, 1fr) 402px; gap: 64px; align-items: start; padding-top: 72px; }
      .Description { color: var(--text-dim); margin-top: 16px; }
      .Page.with-pointer { padding-top: 196px; }
      .Pointer { position: absolute; top: 20px; right: clamp(20px, 8vw, 132px); width: min(220px, calc(100% - 40px)); padding-top: 80px; text-align: center; }
      .Pointer_Arrow { position: absolute; top: 0; right: 0; width: 100%; height: 68px; color: var(--accent); }
      .Pointer h2 { font-size: 18px; }
      .Pointer p { margin-top: 12px; color: var(--text-dim); }
      @media (min-width: 1740px) { .Page.with-pointer { padding-top: 72px; } }
      .InlineIcon { width: 22px; height: 22px; vertical-align: middle; color: var(--text); }
      .Subscriber { display: flex; align-items: start; gap: 12px; margin-top: 36px; font-size: 13px; text-decoration: none; }
      .Subscriber img { width: 24px; height: 24px; }
      @media (max-width: 900px) { .Page { grid-template-columns: minmax(0, 1fr); gap: 36px; padding-top: 40px; } tutorial-player { max-width: 402px; } }
    </style>
    <tab-header></tab-header>
        ${d?i.qy`
          <aside class="Pointer">
            <svg class="Pointer_Arrow" viewBox="0 0 220 68" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 60h196a8 8 0 0 0 8-8V8m-8 8 8-8 8 8"/></svg>
            <h2>${(0,r.Ay)("pin_the_browsec_extension")}</h2>
            <p>${(0,r.Ay)("click_and_then_1")}
              <svg class="InlineIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" role="img" aria-label="${(0,r.Ay)("browser_extensions_menu")}"><path d="M10 6H6v4H4a3 3 0 0 0 0 6h2v6h5v-2a3 3 0 0 1 6 0v2h5v-6h-2a3 3 0 0 1 0-6h2V6h-6V4a3 3 0 0 0-6 0z"/></svg>
              ${(0,r.Ay)("click_and_then_2")}
              <svg class="InlineIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" role="img" aria-label="${(0,r.Ay)("browser_pin")}"><path d="M8 3h8l-1 7 4 4v2H5v-2l4-4zM12 16v6"/></svg>
            </p>
          </aside>`:""}
    <main class="Page ${d?"with-pointer":""}">
      <div>
        <h1>${(0,r.Ay)("browsec_has_been_installed")}</h1>
        <p class="Description">${(0,r.Ay)("you_may_now_open_the_extension")}</p>
        <p class="Description">${(0,r.Ay)("open_browsec_from_toolbar")}</p>

        <a class="Subscriber" href="${t}" target="_blank" rel="noopener" @click="${g}">
          <img src="/images/congratulations/telegram-logo.svg" alt="" />
          <span>${(0,r.Ay)("subscriber_text")}</span>
        </a>
      </div>
      <tutorial-player autoplay asset="start-${e}" label="${(0,r.Ay)("you_may_now_open_the_extension")}"></tutorial-player>
    </main>`}Object.defineProperty(h,"name",{value:"default",configurable:!0});class m extends i.WF{render(){return h.call(this)}}customElements.define("main-block-modern",m);var v=n(636),b=n(8131);(0,v.A)("congratulations"),document.title=(0,r.Ay)("you_just_installed_browsec"),(async()=>{let e=await b.A.get("congrats_number")||0;e++,a.A.track("congrats_tab_open",{congrats_number:e.toString()}),await b.A.set("congrats_number",e)})();const x=new Promise((e=>{window.addEventListener("DOMContentLoaded",(()=>{e()}))}));(async e=>{const t=(0,o.A)();window.language=t,document.documentElement.lang=t,await x;const n=document.querySelector("div.Main > div.In");null==n||null===(e=n.append)||void 0===e||e.call(n,document.createElement("main-block-modern"))})()}},n={};function r(e){var o=n[e];if(void 0!==o)return o.exports;var i=n[e]={id:e,loaded:!1,exports:{}};return t[e].call(i.exports,i,i.exports,r),i.loaded=!0,i.exports}r.m=t,e=[],r.O=(t,n,o,i)=>{if(!n){var a=1/0;for(p=0;p<e.length;p++){for(var[n,o,i]=e[p],l=!0,s=0;s<n.length;s++)(!1&i||a>=i)&&Object.keys(r.O).every((e=>r.O[e](n[s])))?n.splice(s--,1):(l=!1,i<a&&(a=i));if(l){e.splice(p--,1);var c=o();void 0!==c&&(t=c)}}return t}i=i||0;for(var p=e.length;p>0&&e[p-1][2]>i;p--)e[p]=e[p-1];e[p]=[n,o,i]},r.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return r.d(t,{a:t}),t},r.d=(e,t)=>{for(var n in t)r.o(t,n)&&!r.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},r.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),r.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.nmd=e=>(e.paths=[],e.children||(e.children=[]),e),r.j=556,(()=>{var e={556:0};r.O.j=t=>0===e[t];var t=(t,n)=>{var o,i,[a,l,s]=n,c=0;if(a.some((t=>0!==e[t]))){for(o in l)r.o(l,o)&&(r.m[o]=l[o]);if(s)var p=s(r)}for(t&&t(n);c<a.length;c++)i=a[c],r.o(e,i)&&e[i]&&e[i][0](),e[i]=0;return r.O(p)},n=self.webpackChunkbrowsec_extension=self.webpackChunkbrowsec_extension||[];n.forEach(t.bind(null,0)),n.push=t.bind(null,n.push.bind(n))})();var o=r.O(void 0,[76],(()=>r(490)));o=r.O(o)})();