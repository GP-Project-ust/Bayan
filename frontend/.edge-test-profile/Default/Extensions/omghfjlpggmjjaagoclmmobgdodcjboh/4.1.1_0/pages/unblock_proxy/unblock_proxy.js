(()=>{"use strict";var e,t={4070(e,t,n){n(5564);var s=n(5471);const i=Object.assign(((...e)=>{(0,s.A)({type:"log",data:e}),console.log.apply(console,e)}),{warn:(...e)=>{(0,s.A)({type:"log.warn",data:e}),console.warn.apply(console,e)},error:(...e)=>{(0,s.A)({type:"log.error",data:e}),console.error.apply(console,e)}});var o=n(3602),r=n(680),a=n(5087),c=n(7130),d=n(1927);n(3894);Object.defineProperty(p,"name",{value:"default",configurable:!0});const l=Object.fromEntries(Object.entries({becauseYourProxySettingsAreBlocked:"because_your_proxy_settings_are_blocked",browsecIsEnabled:"browsec_is_enabled",cantSetupSecureConnection:"cant_setup_secure_connection",contactSupport:"contact_support",continueUsingBrowsecToOpenWebsites:"continue_using_browsec_to_open_websites",disableSelectedExtensions:"disable_selected_extensions",fixProxySettings:"fix_proxy_settings",pleaseTryAgainOrContactSupport:"please_try_again_or_contact_support",selectAllowInPopupWindow:"select_allow_in_popup_window",somethingWentWrong:"something_went_wrong",tryAgain:"try_again",yourProxySettingsAreBlocked:"your_proxy_settings_are_blocked"}).map((([e,t])=>[e,(0,c.Ay)(t)])));function p(){return d.qy`
  <style>
${a.A}

  :host { --page-width: 800px; }
  .Body { max-width: var(--page-width); margin: 0 auto; padding: 64px var(--page-gutter) 72px; }
  .Box { margin: 0; }
  .SettingsBlocked_Title, .Box_Success_Ok, .Box_Error_ErrorText { font-size: clamp(26px, 3vw, 34px); font-weight: 600; line-height: 1.25; letter-spacing: -.025em; margin-bottom: 20px; }
  p { color: var(--text-dim); margin-bottom: 28px; }
  .SettingsBlocked_Advice { color: var(--text-dim); font-size: 13px; margin-top: 12px; }
  .Box_Success_Ok { color: var(--accent); }
  .Box_Error_ErrorText { color: var(--warn); }
  .Box_Success_Text, .Box_Error_Text { color: var(--text-dim); }
  .try-again { margin-top: 24px; }
  .ContactSupport { margin-top: 20px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 12px 8px; border-bottom: 1px solid var(--line); }
  td:first-child { width: 32px; padding-left: 0; }
  .Extensions_Name { overflow-wrap: anywhere; }
  .Extensions_Button { margin-top: 24px; }
  .Notice { margin-top: 20px; }
  .Loading { color: var(--text-dim); margin-top: 16px; }
  @media (max-width: 600px) { .Body { padding: 36px var(--page-gutter) 48px; } }

  </style>

 <tab-header></tab-header>

  <main class="Body" aria-busy="${this.busy}"><div class="In">
    ${(()=>{switch(this.mode){case"information":return d.qy`
    <div class="Box warning">
    ${(()=>this.hasManagement?d.qy`
      <div class="Extensions">
        <h1 class="SettingsBlocked_Title">${l.yourProxySettingsAreBlocked}</h1>
        ${this.extensions.length?"":d.qy`<p>${(0,c.Ay)("no_conflicting_extensions")}</p>`}
        <table><tbody>
      ${this.extensions.map((e=>d.qy`
          <tr>
            <td class="Extensions_Square"><div class="In"><div class="In">
              <input id="${e.id}" type="checkbox" ?disabled="${this.busy}" .checked="${e.checked}" @change="${t=>this.extensionCheckbox(e.id,t)}"/>
            </div></div></td>
            <td class="Extensions_Square"><div class="In"><div class="In">
              ${e.icon?d.qy`<img src="${e.icon}" width="28" height="28" alt="" />`:""}
            </div></div></td>
            <td><label class="Extensions_Name" for="${e.id}">${e.name}</label></td>
          </tr>`))}
        </tbody></table>
        <div class="Extensions_Button"><button ?disabled="${this.busy||this.extensions.length>0&&!this.extensions.some((e=>e.checked))}" class="btn" @click="${this.disableExtensions}">${this.extensions.length?l.disableSelectedExtensions:l.tryAgain}</button></div>
      </div>`:d.qy`
      <div class="SettingsBlocked">
        <h1 class="SettingsBlocked_Title">${l.yourProxySettingsAreBlocked}</h1>
        <p>
          ${l.cantSetupSecureConnection}<br/>
          ${l.becauseYourProxySettingsAreBlocked}
        </p>

        <div>
          <div><button ?disabled="${this.busy}" class="btn" @click="${this.scanExtensions}">${l.fixProxySettings}</button></div>
          <div class="SettingsBlocked_Advice">${l.selectAllowInPopupWindow}</div>
        </div>
      </div>`)()}
    </div>`;case"success":return d.qy`
    <div class="Box success">
      <h1 class="Box_Success_Ok"><span class="In">${l.browsecIsEnabled}</span></h1>
      <div class="Box_Success_Text">${l.continueUsingBrowsecToOpenWebsites}</div>
    </div>`;case"error":return d.qy`
    <div class="Box error">
      <h1 class="Box_Error_ErrorText"><span class="In">${l.somethingWentWrong}</span></h1>
      <div class="Box_Error_Text">${l.pleaseTryAgainOrContactSupport}</div>
      <div><button ?disabled="${this.busy}" class="try-again btn" @click="${this.scanExtensions}">${l.tryAgain}</button></div>
      <div class="ContactSupport">
        <a href="${this.contactSupportUrl}" target="_blank" rel="noopener">${l.contactSupport}</a>
      </div>
    </div>`;default:return""}})()}
  </div>
    ${this.permissionDenied?d.qy`<p class="Notice" role="alert">${this.permissionMessage}</p>`:""}
    ${this.busy?d.qy`<p class="Loading" role="status">${(0,c.Ay)("running_dots")}</p>`:""}
  </main>`}var u=n(8113),h=n(8085);class g extends Error{}async function m(){if((0,h.y4)())return chrome;let e=document.querySelector("#managementIframe");if(!e){e=document.createElement("iframe"),e.id="managementIframe",e.hidden=!0,e.src="/pages/management/management.html";const t=new Promise(((t,n)=>{e.onload=()=>t(),e.onerror=()=>n(new Error("Management document failed to load"))}));document.body.append(e),await t}return e.contentWindow.chrome}async function y(){if(!await chrome.permissions.request({permissions:["management"]}))throw new g}async function x(){var e;const t=await(0,s.A)({type:"proxy disable broken mode"});if(!t.success)throw new Error((null===(e=t.error)||void 0===e?void 0:e.message)||"Proxy recovery failed")}class b extends d.WF{constructor(...e){super(...e),this.debugConflicts="conflicts"===new URLSearchParams(window.location.search).get("debug"),this.extensions=[],this.hasManagement=!1,this.busy=!1,this.permissionDenied=!1,this.mode="information",this.contactSupportUrl=o.A.contactUs}static get properties(){return{extensions:{type:Array},hasManagement:{type:Boolean},busy:{type:Boolean},permissionDenied:{type:Boolean},mode:{type:String},contactSupportUrl:{type:String}}}render(){return p.call(this)}async firstUpdated(){if(this.debugConflicts)return void this.showDebugConflicts();const e=await r.A.getStateAsync();this.contactSupportUrl=(0,u.A)(o.A.contactUs,(t=>({...t,instd:e.daysAfterInstall})));const{permissions:t}=await chrome.permissions.getAll();t.includes("management")&&await this.runAction((async()=>{this.hasManagement=!0,await this.getExtensionsList()}))}showDebugConflicts(){this.hasManagement=!0,this.extensions=[{id:"debug-proxy-a",name:"Example VPN",checked:!0},{id:"debug-proxy-b",name:"Example Proxy Manager — browser connection settings",checked:!0},{id:"debug-proxy-c",name:"Example Privacy Extension",checked:!1}]}async runAction(e){if(!this.busy){this.busy=!0,this.permissionDenied=!1;try{await e()}catch(e){e instanceof g?this.permissionDenied=!0:(this.mode="error",i.error("Unblock proxy error: ",e))}finally{this.busy=!1}}}async disableExtensions(){await this.runAction((async()=>{const e=this.extensions.filter((e=>e.checked));if(!this.extensions.length||e.length)if(this.debugConflicts)this.mode="success";else{if(e.length){await y();const t=await m();for(const{id:n}of e)await new Promise(((e,s)=>{t.management.setEnabled(n,!1,(()=>{const n=t.runtime.lastError;n?s(new Error(n.message)):e()}))}))}await x(),this.mode="success"}}))}extensionCheckbox(e,t){const n=t.currentTarget.checked;this.extensions=this.extensions.map((t=>t.id===e?{...t,checked:n}:t))}async getExtensionsList(){if(this.debugConflicts)return void this.showDebugConflicts();const e=await m(),t=await new Promise(((t,n)=>{e.management.getAll((s=>{const i=e.runtime.lastError;i?n(new Error(i.message)):t(s)}))}));this.extensions=t.filter((e=>e.enabled&&e.id!==chrome.runtime.id&&e.permissions.includes("proxy"))).map((({id:e,name:t})=>({id:e,name:t,checked:!0})))}async scanExtensions(){if(this.debugConflicts)return this.mode="information",this.permissionDenied=!1,void this.showDebugConflicts();await this.runAction((async()=>{if(await(0,s.A)({type:"proxy.isControlled"}))try{return await x(),void(this.mode="success")}catch(e){}await y(),this.hasManagement=!0,this.mode="information",await this.getExtensionsList()}))}get permissionMessage(){return(0,c.Ay)("page_permission_denied")}}customElements.define("main-block",b);var f=n(1743);document.title=(0,c.Ay)("your_proxy_settings_are_blocked"),(async e=>{await r.A.initiate();const t=(0,f.A)();window.language=t,document.documentElement.lang=t;const n=document.querySelector("div.main");null==n||null===(e=n.append)||void 0===e||e.call(n,document.createElement("main-block"))})()}},n={};function s(e){var i=n[e];if(void 0!==i)return i.exports;var o=n[e]={id:e,loaded:!1,exports:{}};return t[e].call(o.exports,o,o.exports,s),o.loaded=!0,o.exports}s.m=t,e=[],s.O=(t,n,i,o)=>{if(!n){var r=1/0;for(l=0;l<e.length;l++){for(var[n,i,o]=e[l],a=!0,c=0;c<n.length;c++)(!1&o||r>=o)&&Object.keys(s.O).every((e=>s.O[e](n[c])))?n.splice(c--,1):(a=!1,o<r&&(r=o));if(a){e.splice(l--,1);var d=i();void 0!==d&&(t=d)}}return t}o=o||0;for(var l=e.length;l>0&&e[l-1][2]>o;l--)e[l]=e[l-1];e[l]=[n,i,o]},s.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return s.d(t,{a:t}),t},s.d=(e,t)=>{for(var n in t)s.o(t,n)&&!s.o(e,n)&&Object.defineProperty(e,n,{enumerable:!0,get:t[n]})},s.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),s.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),s.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},s.nmd=e=>(e.paths=[],e.children||(e.children=[]),e),s.j=568,(()=>{var e={568:0};s.O.j=t=>0===e[t];var t=(t,n)=>{var i,o,[r,a,c]=n,d=0;if(r.some((t=>0!==e[t]))){for(i in a)s.o(a,i)&&(s.m[i]=a[i]);if(c)var l=c(s)}for(t&&t(n);d<r.length;d++)o=r[d],s.o(e,o)&&e[o]&&e[o][0](),e[o]=0;return s.O(l)},n=self.webpackChunkbrowsec_extension=self.webpackChunkbrowsec_extension||[];n.forEach(t.bind(null,0)),n.push=t.bind(null,n.push.bind(n))})();var i=s.O(void 0,[76],(()=>s(4070)));i=s.O(i)})();