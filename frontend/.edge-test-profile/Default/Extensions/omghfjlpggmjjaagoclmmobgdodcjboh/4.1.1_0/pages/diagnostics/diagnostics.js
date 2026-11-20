(()=>{"use strict";var e,t={2995(e,t,s){s(5564);var i=s(1743);const n=(e,t)=>{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return self.scrollTo(0,e),Promise.resolve();let s=performance.now(),i=self.pageYOffset;return new Promise((n=>{let o=()=>{let r=performance.now()-s;if(r>t)return self.scrollTo(0,e),void n();self.scrollTo(0,i+(e-i)*r/t),requestAnimationFrame(o)};requestAnimationFrame(o)}))};(Object.getOwnPropertyDescriptor(n,"name")||{}).writable||Object.defineProperty(n,"name",{value:"default",configurable:!0});var o=s(5471),r=s(8085);let a=(0,r.BZ)().runtime.connect({name:"diagnostics"}),c=[];a.onMessage.addListener((e=>{c.forEach((t=>{t(e)}))}));const l=e=>{c.push(e)},d=async()=>{let e=await(0,o.A)({type:"Diagnostics.getState"});if(!e)throw new Error("Connection with background failed");return e},p=async()=>{let e=await(0,o.A)({type:"Diagnostics.getSteps"});if(!e)throw new Error("Connection with background failed");return e},h=e=>{c=c.filter((t=>t!==e))},u=e=>(0,o.A)({type:"Diagnostics.start",extensions:e}),v=()=>(0,o.A)({type:"Diagnostics.terminate"}),y=async e=>{if(!await(async()=>(0,r.isFirefox)()?browser.permissions.request({permissions:["management"]}):chrome.permissions.request({permissions:["management"]}))())throw new Error("Not enough permissions");if(!(0,r.y4)())return[];const t=(()=>{if((0,r.y4)())return chrome;const e=document.querySelector("#managementIframe");return e?e.contentWindow.chrome:void 0})();return t?(await Promise.all(e.map((e=>new Promise((s=>{t.management.setEnabled(e,!1,s)}))))),new Promise((e=>{t.management.getAll(e)}))):[]};(Object.getOwnPropertyDescriptor(y,"name")||{}).writable||Object.defineProperty(y,"name",{value:"default",configurable:!0});var g=s(5087),m=s(7130),x=s(1927);s(3894);Object.defineProperty(k,"name",{value:"default",configurable:!0});(0,r.BZ)();const f=Object.fromEntries(Object.entries({checkConflictsWithOtherExtensions:"check_conflicts_with_other_extensions",checkBrowsecApi:"check_browsec_api",checkHttpInternetConnection:"check_http_internet_connection",checkHttpInternetConnectionWithBrowsec:"check_http_internet_connection_with_browsec",checkHttpsInternetConnection:"check_https_internet_connection",checkHttpsInternetConnectionWithBrowsec:"check_https_internet_connection_with_browsec",checkProxySettings:"check_proxy_settings",closePage:"close_page",fixIt:"fix_it",running:"running_dots",start:"start",tryAgain:"try_again",weHaveDetectedOtherExtensionsWhichBlockAccess:"we_have_detected_other_extensions_which_block_access",weHaveDetectedOtherExtensionsWhichCanConflict:"we_have_detected_other_extensions_which_can_conflict",youCanEnableTheseExtensionsLater:"you_can_enable_these_extensions_later"}).map((([e,t])=>[e,(0,m.Ay)(t)]))),b=(e,t,s)=>{if(!t)return!1;let i=e.find((({name:e})=>"proxyApi"===e));return!i||"error"===i.state===("proxyApi"===s)},w=(e,t)=>{var s;switch(null===(s=e.find((({name:e})=>e===t)))||void 0===s?void 0:s.state){case"not started":default:return"";case"in process":return"progress";case"success":return"success";case"partial":return"partial";case"error":return"error"}},$=(e,t)=>{var s;let i=null===(s=e.find((({name:e})=>e===t)))||void 0===s?void 0:s.requests;if(!i)return"";let{success:n,total:o}=i;return n&&n!==o?n+"/"+o:""},_=(e,t)=>{let s=e.find((({name:e})=>e===t));if(!s)throw new Error(`Step ${t} not found!`);return s.state};function k({possibleSteps:e}){return x.qy`
  <style>
${g.A}

  .MainStatus { padding-top: 28px; }
  .MainStatus_Running { display: inline-flex; gap: 10px; align-items: center; color: var(--text-dim); min-height: 44px; }
  .MainStatus_Running::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: var(--brand); }
  .Steps { margin-top: 24px; }
  .Steps > .E { display: grid; grid-template-columns: 128px minmax(0, 1fr); gap: 12px 20px; padding: 10px 0; border-bottom: 1px solid var(--line); align-items: center; }
  .Steps_Name { font-size: 15px; line-height: 1.5; }
  .Extensions { grid-column: 1 / -1; padding: 8px 0 8px 148px; }
  .Extensions > .In { padding: 20px; background: var(--surface-2); border-radius: 8px; }
  .Extensions_Text { padding-bottom: 16px; }
  .Extensions_Later { color: var(--text-dim); font-size: 13px; padding-top: 16px; }
  .Result { margin-top: 24px; padding: 20px; border-radius: 8px; background: var(--surface-2); }
  .FinalActionButton { text-align: left; margin-top: 16px; }
  c-logs { padding-top: 8px; }
  .Notice { margin-top: 16px; }
  @media (max-width: 600px) {
    .Steps > .E { grid-template-columns: 112px minmax(0, 1fr); gap: 12px; }
    .Extensions { padding-left: 0; }
  }

  </style>

  <div class="MainStatus" aria-busy="${this.busy}" aria-live="polite">
  ${(()=>this.noStepsStarted?x.qy`
    <div class="MainStatus_Button">
      <input
        type="button"
        ?disabled="${this.busy}"
        value="${f.start}"
        @click="${this.startDiagnostics}"
      />
    </div>`:"")()}

  ${(()=>this.runningSteps?x.qy`
    <div class="MainStatus_Running">${f.running}</div>`:"")()}

  ${(()=>this.allStepsComplete?x.qy`
    <div class="MainStatus_Button">
      <input
        type="button"
        ?disabled="${this.busy}"
        value="${f.tryAgain}"
        @click="${this.startDiagnostics}"
      />
    </div>`:"")()}
  </div>

  ${this.actionError?x.qy`<p class="Notice" role="alert">${this.actionError}</p>`:""}
  <div class="Steps">
  ${(()=>e.includes("proxyApi")?x.qy`
    <div class="E ${w(this.state,"proxyApi")}">
      <step-state
        .state="${_(this.state,"proxyApi")}"
        .completion="${$(this.state,"proxyApi")}"></step-state>
      <div class="Steps_Name">${f.checkProxySettings}</div>
    ${(()=>b(this.state,this.extensionsVisible,"proxyApi")?x.qy`
      <div class="Extensions"><div class="In">
        <div class="Extensions_Text">${f.weHaveDetectedOtherExtensionsWhichBlockAccess}</div>
        <c-extensions
          .extensions="${this.extensions}"
          @recovery-error="${()=>{this.actionError=(0,m.Ay)("please_try_again_or_contact_support")}}"
          @extensions-update="${this.extensionsUpdate}"></c-extensions>
        <div class="Extensions_Later">${f.youCanEnableTheseExtensionsLater}</div>
      </div></div>`:"")()}
    </div>`:"")()}

  ${(()=>e.includes("noProxyExtensions")?x.qy`
    <div class="E ${w(this.state,"noProxyExtensions")}">
      <step-state
        .state="${_(this.state,"noProxyExtensions")}"
        .completion="${$(this.state,"noProxyExtensions")}"></step-state>
      <div class="Steps_Name">${f.checkConflictsWithOtherExtensions}</div>
    ${(()=>b(this.state,this.extensionsVisible,"noProxyExtensions")?x.qy`
      <div class="Extensions"><div class="In">
        <div class="Extensions_Text">${f.weHaveDetectedOtherExtensionsWhichCanConflict}</div>
        <c-extensions
          .extensions="${this.extensions}"
          @recovery-error="${()=>{this.actionError=(0,m.Ay)("please_try_again_or_contact_support")}}"
          @extensions-update="${this.extensionsUpdate}"></c-extensions>
        ${(0,r.isFirefox)()?"":x.qy`
          <div class="Extensions_Later">${f.youCanEnableTheseExtensionsLater}</div>`}
      </div></div>`:"")()}
    </div>`:"")()}

  ${(()=>e.includes("httpConnection")?x.qy`
    <div class="E ${w(this.state,"httpConnection")}">
      <step-state
        .state="${_(this.state,"httpConnection")}"
        .completion="${$(this.state,"httpConnection")}"></step-state>
      <div class="Steps_Name">${f.checkHttpInternetConnection}</div>
    </div>`:"")()}

    ${(()=>e.includes("httpsConnection")?x.qy`
    <div class="E ${w(this.state,"httpsConnection")}">
      <step-state
        .state="${_(this.state,"httpsConnection")}"
        .completion="${$(this.state,"httpsConnection")}"></step-state>
      <div class="Steps_Name">${f.checkHttpsInternetConnection}</div>
    </div>`:"")()}

  ${(()=>e.includes("browsecApi")?x.qy`
    <div class="E ${w(this.state,"browsecApi")}">
      <step-state
        .state="${_(this.state,"browsecApi")}"
        .completion="${$(this.state,"browsecApi")}"></step-state>
      <div class="Steps_Name">${f.checkBrowsecApi}</div>
    </div>`:"")()}

  ${(()=>e.includes("httpProxyConnection")?x.qy`
    <div class="E ${w(this.state,"httpProxyConnection")}">
      <step-state
        .state="${_(this.state,"httpProxyConnection")}"
        .completion="${$(this.state,"httpProxyConnection")}"></step-state>
      <div class="Steps_Name">${f.checkHttpInternetConnectionWithBrowsec}</div>
    </div>`:"")()}

  ${(()=>e.includes("httpsProxyConnection")?x.qy`
    <div class="E ${w(this.state,"httpsProxyConnection")}">
      <step-state
        .state="${_(this.state,"httpsProxyConnection")}"
        .completion="${$(this.state,"httpsProxyConnection")}"></step-state>
      <div class="Steps_Name">${f.checkHttpsInternetConnectionWithBrowsec}</div>
    </div>`:"")()}
  </div>

  ${(()=>this.allStepsComplete?x.qy`
    <section class="Result" aria-live="polite">
    <c-summary
      .fixable="${this.extensionsVisible}"
      .blockedByAntivirus="${this.blockedByAntivirus}"
      .state="${this.state}"></c-summary>
    ${(()=>this.extensionsVisible?x.qy`
    <div class="FinalActionButton">
      <input
        type="button"
        ?disabled="${this.busy}"
        value="${f.fixIt}"
        @click="${this.fixExtensions}"
      />
    </div>`:this.blockedByAntivirus?x.qy`
    <div class="FinalActionButton">
      <input
        type="button"
        ?disabled="${this.busy}"
        value="${f.tryAgain}"
        @click="${this.startDiagnostics}"
      />
    </div>`:x.qy`
      <div class="FinalActionButton">
        <input
          type="button"
        ?disabled="${this.busy}"
          value="${f.closePage}"
          @click="${this.closePage}"
        />
      </div>`)()}
    <c-logs></c-logs>
    </section>`:"")()}`}Object.defineProperty(S,"name",{value:"default",configurable:!0});const E=(0,m.Ay)("disable");function S(){return x.qy`
  <style>
${g.A}

  table { border-collapse: collapse; width: 100%; }
  td { padding: 6px; }
  td:first-child { width: 24px; padding-left: 0; }
  .Icon, img { width: 28px; height: 28px; object-fit: contain; }
  .Name { cursor: pointer; overflow-wrap: anywhere; }
  .Disable { margin-top: 16px; }

  </style>

  <div class="List"><table><tbody>
  ${this.views.map(((e,t)=>x.qy`
    <tr>
      <td>
        <input
          type="checkbox"
          ?disabled="${this.busy}"
          id="${e.id}"
          ?checked="${e.checked}"
          @click="${this.clickCheckbox(t)}" />
      </td>
      <td>
        ${(()=>e.icon?(0,r.isFirefox)()?x.qy`
        <div class="Icon"></div>`:x.qy`
        <img
          src="${e.icon}"
          width="38"
          height="38"
          alt=""
          @click="${this.clickCheckbox(t)}"/>`:"")()}
      </td>
      <td><label class="Name" for="${e.id}">${e.name}</label></td>
    </tr>`))}
  </tbody></table></div>
  ${(()=>(0,r.isFirefox)()?"":x.qy`
  <div class="Disable">
    <input
      type="button"
      ?disabled="${this.busy||!this.views.some((e=>e.checked))}"
      value="${E}"
      @click="${this.disableExtensions}"
    />
  </div>`)()}`}class A extends x.WF{render(){return S.call(this)}static get properties(){return{busy:{type:Boolean},extensions:{type:Array},views:{type:Array}}}constructor(){super(),this.busy=!1,this.extensions=[],this.views=[]}updated(e){if(e.has("extensions")){var t,s;let e=(null===(t=this.views)||void 0===t||null===(s=t.slice)||void 0===s?void 0:s.call(t))||[];this.views=this.extensions.map((t=>{var s;let i=Object.assign({},t),n=e.find((({id:e})=>e===i.id));return i.checked=null===(s=null==n?void 0:n.checked)||void 0===s||s,i}))}}clickCheckbox(e){return({target:t})=>{let s=Object.assign({},this.views[e]),i=this.views.slice();s.checked=!s.checked,i[e]=s,this.views=i}}async disableExtensions(){if(this.views.filter((({checked:e})=>e)).length&&!this.busy){this.busy=!0;try{let e=await y(this.views.filter((({checked:e})=>e)).map((({id:e})=>e)));this.extensions=[],this.dispatchEvent(new CustomEvent("extensions-update",{detail:this.extensions})),await v(),await u(e)}catch(e){this.dispatchEvent(new CustomEvent("recovery-error"))}finally{this.busy=!1}}}}customElements.define("c-extensions",A);var C=s(6597);Object.defineProperty(P,"name",{value:"default",configurable:!0});const q=Object.fromEntries(Object.entries({copyToClipboard:"copy_to_clipboard",hideHealthCheckLogs:"hide_health_check_logs",showHealthCheckLogs:"show_health_check_logs"}).map((([e,t])=>[e,(0,m.Ay)(t)])));function P(){return x.qy`
  <style>
${g.A}

  .Show { text-align: left; }
  .Show button { min-height: 36px; padding: 4px 0; border: 0; background: transparent; color: var(--accent); font-weight: 500; text-decoration: underline; text-underline-offset: 3px; }
  .Textarea { margin-top: 16px; }
  textarea { display: block; width: 100%; height: 300px; padding: 16px; border: 1px solid var(--line-2); border-radius: 8px; background: var(--surface-2); color: var(--text-dim); font: 12px/1.6 ui-monospace, monospace; resize: vertical; }
  .Button { margin-top: 16px; text-align: left; }
  .Button input { background: var(--surface-2); color: var(--text); border-color: var(--line-2); }
  .Button input:hover { background: var(--line); }

  </style>

  <div class="Show">
    <div class="In">
      <button class="In" aria-expanded="${this.visible}" aria-controls="health-check-logs" @click="${this.toggleLog}">
        ${this.visible?q.hideHealthCheckLogs:q.showHealthCheckLogs}
      </button>
    </div>
  </div>

  ${(0,C.z)(this.visible,(()=>x.qy`
    <div class="Textarea">
      <textarea
        id="health-check-logs"
        aria-label="${q.showHealthCheckLogs}"
        name="logs"
        rows="8"
        cols="80"
        .value="${this.text}"
        readonly="readonly"
        spellcheck="false"></textarea>
    </div>
    <div class="Button">
      <input 
        type="button" 
        value="${q.copyToClipboard}" 
        @click="${this.copy}"
      />
    </div>`))}
  `}class B extends x.WF{render(){return P.call(this)}static get properties(){return{visible:{type:Boolean},logLoaded:{type:Boolean},text:{type:String}}}constructor(){super(),this.logLoaded=!1,this.text="",this.visible=!1}async toggleLog(){var e,t;let s=!this.visible,i=(async()=>{this.logLoaded||(this.logLoaded=!0,this.text=await(0,o.A)({type:"Diagnostics.getLog"})),this.visible=!this.visible})();if(!s)return;await i,await this.updateComplete;const r=null!==(e=null===(t=document.scrollingElement)||void 0===t?void 0:t.scrollHeight)&&void 0!==e?e:0,a=document.documentElement.clientHeight;r<=a||(await new Promise((e=>{setTimeout(e,200)})),n(r-a,750))}copy(){var e,t;const s=null===(e=this.shadowRoot)||void 0===e||null===(t=e.querySelector)||void 0===t?void 0:t.call(e,'textarea[name="logs"]');if(!s)throw new Error("textarea element does not exist in Logs");s.select(),document.execCommand("copy"),s.setSelectionRange(0,0),s.blur()}}customElements.define("c-logs",B);const O=(e,t=20)=>x.qy`
  <svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" aria-hidden="true"
    stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9" />
    ${"success"===e?x.JW`<path d="m7.5 12 3 3 6-6" />`:""}
    ${"error"===e?x.JW`<path d="m9 9 6 6m0-6-6 6" />`:""}
    ${"warning"===e?x.JW`<path d="M12 7v6m0 4h.01" />`:""}
    ${"skip"===e?x.JW`<path d="M8 12h8" />`:""}
    ${"in process"===e?x.JW`<path d="M12 7v5l3 2" />`:""}
  </svg>`;(Object.getOwnPropertyDescriptor(O,"name")||{}).writable||Object.defineProperty(O,"name",{value:"default",configurable:!0}),Object.defineProperty(j,"name",{value:"default",configurable:!0});function j(){window.language;return x.qy`
  <style>
${g.A}

  :host { display: flex; align-items: center; gap: 10px; font-size: 12px; line-height: 1.4; color: var(--text-dim); }
  .Text { order: 1; overflow-wrap: anywhere; }
  .Icon { display: flex; flex-shrink: 0; }
  :host(.success) { color: var(--accent); }
  :host(.error) { color: var(--warn); }
  :host(.progress) { color: var(--text); }
  :host(.warning) { color: var(--text); }
  :host(.warning) .Icon { color: var(--rating-icon); }
  </style>
  
  <div class="Text"><div class="In">${(e=>{switch(e){case"skip":return(0,m.Ay)("skipped");case"in process":return(0,m.Ay)("running");case"success":return(0,m.Ay)("completed");case"warning":return(0,m.Ay)("warning");case"error":return(0,m.Ay)("failed");default:return""}})(this.state)} ${this.completion}</div></div>
  <div class="Icon">${O(this.state)}</div>`}class I extends x.WF{render(){return j.call(this)}static get properties(){return{completion:{type:String},state:{type:String}}}constructor(){super(),this.completion="",this.state="not started"}updated(e){if(e.has("state")){let e=(()=>{switch(this.state){case"skip":return"skip";case"in process":return"progress";case"success":return"success";case"warning":return"warning";case"error":return"error";default:return""}})();["skip","progress","success","warning","error"].forEach((e=>{this.classList.remove(e)})),e&&this.classList.add(e)}}}customElements.define("step-state",I);var L=s(7424);Object.defineProperty(W,"name",{value:"default",configurable:!0});const{_:T}=self;function W(){return x.qy`
  <style>
${g.A}

  :host { font-size: 15px; line-height: 1.6; }
  .Success, .Warning, .Error { display: none; grid-template-columns: 24px minmax(0, 1fr); align-items: start; gap: 12px; text-align: left; }
  .Success { color: var(--accent); }
  .Warning { color: var(--text); }
  .Error { color: var(--warn); }
  .Icon { display: flex; padding-top: 2px; }
  .Warning .Icon { color: var(--rating-icon); }
  :host(.success) .Success, :host(.warning) .Warning, :host(.error) .Error { display: grid; }

  </style>

  ${(()=>this.fixable?x.qy`
        <div class="Fixable ${T.upperFirst(this.ownState)}">
          <div class="Icon">${O(this.ownState,24)}</div>
          <div class="Text">${(0,L._)((0,m.Ay)("diagnostic_summury_fixable"))}</div>
        </div>
      `:this.blockedByAntivirus?x.qy`
        <div class="Fixable ${T.upperFirst(this.ownState)}">
          <div class="Icon">${O(this.ownState,24)}</div>
          <div class="Text">${(0,L._)((0,m.Ay)("diagnostic_summury_antivirus"))}</div>
        </div>
      `:x.qy`
      <div class="Success">
        <div class="Icon">${O("success",24)}</div>
        <div class="Text">${(0,L._)((0,m.Ay)("diagnostic_summury_success"))}</div>
      </div>

      <div class="Warning">
        <div class="Icon">${O("warning",24)}</div>
        <div class="Text">${(0,L._)((0,m.Ay)("diagnostic_summury_warning"))}</div>
      </div>

      <div class="Error">
        <div class="Icon">${O("error",24)}</div>
        <div class="Text">${(0,L._)((0,m.Ay)("diagnostic_summury_error"))}</div>
      </div>
    `)()}`}class F extends x.WF{render(){return W.call(this)}static get properties(){return{fixable:{type:Boolean},blockedByAntivirus:{type:Boolean},ownState:{type:String},state:{type:Array}}}constructor(){super(),this.fixable=null,this.blockedByAntivirus=null,this.ownState="",this.state=[]}updated(e){if(e.has("ownState")){let t=this.ownState,s=e.get("ownState");s&&this.classList.remove(s),t&&this.classList.add(t)}if(e.has("state")){let e=this.state.map((({state:e})=>e)),t=e.some((e=>!["error","warning","success","skip"].includes(e)))?"":e.some((e=>"error"===e))?"error":e.some((e=>"warning"===e))?"warning":"success";this.ownState!==t&&(this.ownState=t)}}}customElements.define("c-summary",F);const{_:D}=self,H=(()=>{const e="ontouchstart"in window||navigator.maxTouchPoints>0,t=/android [0-9]/i.test(navigator.userAgent)||/iphone;/i.test(navigator.userAgent)||/ipad;/i.test(navigator.userAgent)||/ipod;/i.test(navigator.userAgent);return e&&t})();(async()=>{const e=await p(),t=await d();class s extends x.WF{render(){return k.call(this,{possibleSteps:e})}get extensionsVisible(){return Boolean(this.extensions.length)}get blockedByAntivirus(){if(!this.allStepsComplete)return!1;const e=this.state.find((({name:e})=>"httpProxyConnection"===e));return!(!e||"error"!==e.state)&&(!!e.errors&&e.errors.some((e=>e.includes("forbidden by antivirus"))))}static get properties(){return{busy:{type:Boolean},actionError:{type:String},noStepsStarted:{type:Boolean},runningSteps:{type:Boolean},allStepsComplete:{type:Boolean,observer:"observeAllStepsComplete"},extensions:{type:Array},extensionsVisible:{type:Boolean},blockedByAntivirus:{type:Boolean},state:{type:Array}}}constructor(){super(),this.busy=!1,this.actionError="",this.allStepsComplete=t.every((({state:e})=>!["not started","in process"].includes(e))),this.extensions=[],this.noStepsStarted=t.every((({state:e})=>"not started"===e)),this.runningSteps=t.some((({state:e})=>["not started","in process"].includes(e)))&&D.uniq(t.map((({state:e})=>e))).length>1,this.state=t}async disconnectedCallback(){super.disconnectedCallback(),await v(),h(this.listener)}async firstUpdated(e){super.firstUpdated(e),this.listener=e=>{e=D.cloneDeep(e),this.state=e,this.extensions=(()=>{let t=["proxyApi","noProxyExtensions"].flatMap((t=>{var s;let i=null===(s=e.find((({name:e})=>e===t)))||void 0===s?void 0:s.extensions;return Array.isArray(i)?[i]:[]})).find((e=>e.length));return t||[]})(),this.noStepsStarted=e.every((({state:e})=>"not started"===e)),this.runningSteps=e.some((({state:e})=>["not started","in process"].includes(e)))&&D.uniq(e.map((({state:e})=>e))).length>1,this.allStepsComplete=e.every((({state:e})=>!["not started","in process"].includes(e)))},l(this.listener)}async updated(e){if(e.has("allStepsComplete")){var t,s,i,o;let r=this.allStepsComplete,a=e.get("allStepsComplete");if(!r||a)return;await this.updateComplete,await new Promise((e=>{requestAnimationFrame(e)}));if(!(null===(t=this.shadowRoot)||void 0===t||null===(s=t.querySelector)||void 0===s?void 0:s.call(t,"c-summary")))return;const c=null!==(i=null===(o=document.scrollingElement)||void 0===o?void 0:o.scrollHeight)&&void 0!==i?i:0,l=document.documentElement.clientHeight;if(c<=l)return;n(c-l,750)}}closePage(){self.close(),(0,o.A)({type:"Diagnostics.close"})}extensionsUpdate({detail:e}){this.extensions=e}async fixExtensions(){if(!this.busy){this.busy=!0,this.actionError="";try{let e=await y(this.extensions.map((({id:e})=>e)));this.extensions=[],await v(),await u(e)}catch(e){this.actionError=(0,m.Ay)("please_try_again_or_contact_support")}finally{this.busy=!1}}}async startDiagnostics(){if(!this.busy){this.busy=!0,this.actionError="";try{if(!await((0,r.isFirefox)()?!!H||browser.permissions.request({permissions:["management"]}):chrome.permissions.request({permissions:["management"]})))return void(this.actionError=(0,m.Ay)("page_permission_denied"));const e=await(async()=>{if((0,r.isFirefox)()){if(H)return;return browser.management.getAll()}const e=await(async()=>{if((0,r.y4)())return chrome;const e=document.createElement("iframe");return e.id="managementIframe",await new Promise((t=>{e.addEventListener("load",(()=>{t()})),e.style.cssText="position:absolute;top:-5000px;left:-5000px;width:1px;height:1px;",e.src="/pages/management/management.html",document.body.append(e)})),e.contentWindow.chrome})();return new Promise((t=>{e.management.getAll(t)}))})();await v(),await u(e)}catch(e){this.actionError=(0,m.Ay)("please_try_again_or_contact_support")}finally{this.busy=!1}}}}customElements.define("main-block",s)})();const M=(0,r.BZ)();M.runtime.onMessage.addListener(((e,t,s)=>{switch(null==e?void 0:e.type){case"Diagnostics page existence check":return s(!0),!0;case"Diagnostics: close pages":self.close()}}));const N=M.runtime.getURL("/pages/diagnostics/diagnostics.html");if("function"==typeof M.extension.getViews){M.extension.getViews({type:"tab"}).filter((({location:e})=>e.href===N)).length>=2&&self.close()}const R=Object.fromEntries(Object.entries({browsec_health_check:"browsec_healthcheck",description:"browsec_healthcheck_description"}).map((([e,t])=>[e,(0,m.Ay)(t)])));(async()=>{const e=(0,i.A)();window.language=e,document.documentElement.lang=e;{const e=document.querySelector(".Body");e&&e.append(document.createElement("main-block"))}{const e=document.querySelector(".main");e&&(e.style.cssText="")}const t=document.querySelectorAll("[data-translate-phrase]");for(const e of t){const t=e.dataset.translatePhrase;if(!t)continue;const s=R[t];s&&(e.textContent=s)}})()}},s={};function i(e){var n=s[e];if(void 0!==n)return n.exports;var o=s[e]={id:e,loaded:!1,exports:{}};return t[e].call(o.exports,o,o.exports,i),o.loaded=!0,o.exports}i.m=t,e=[],i.O=(t,s,n,o)=>{if(!s){var r=1/0;for(d=0;d<e.length;d++){for(var[s,n,o]=e[d],a=!0,c=0;c<s.length;c++)(!1&o||r>=o)&&Object.keys(i.O).every((e=>i.O[e](s[c])))?s.splice(c--,1):(a=!1,o<r&&(r=o));if(a){e.splice(d--,1);var l=n();void 0!==l&&(t=l)}}return t}o=o||0;for(var d=e.length;d>0&&e[d-1][2]>o;d--)e[d]=e[d-1];e[d]=[s,n,o]},i.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return i.d(t,{a:t}),t},i.d=(e,t)=>{for(var s in t)i.o(t,s)&&!i.o(e,s)&&Object.defineProperty(e,s,{enumerable:!0,get:t[s]})},i.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),i.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),i.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},i.nmd=e=>(e.paths=[],e.children||(e.children=[]),e),i.j=157,(()=>{var e={157:0};i.O.j=t=>0===e[t];var t=(t,s)=>{var n,o,[r,a,c]=s,l=0;if(r.some((t=>0!==e[t]))){for(n in a)i.o(a,n)&&(i.m[n]=a[n]);if(c)var d=c(i)}for(t&&t(s);l<r.length;l++)o=r[l],i.o(e,o)&&e[o]&&e[o][0](),e[o]=0;return i.O(d)},s=self.webpackChunkbrowsec_extension=self.webpackChunkbrowsec_extension||[];s.forEach(t.bind(null,0)),s.push=t.bind(null,s.push.bind(s))})();var n=i.O(void 0,[76],(()=>i(2995)));n=i.O(n)})();