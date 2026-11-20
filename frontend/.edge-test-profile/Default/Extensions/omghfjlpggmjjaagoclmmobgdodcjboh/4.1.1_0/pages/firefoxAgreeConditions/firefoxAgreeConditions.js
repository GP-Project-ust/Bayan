(()=>{"use strict";var e,t={7172(e,t,i){i(5564);var r,c,n,a,o,s,l,d,f,p,h=i(636),u=i(1743),b=i(7130),y=i(1927),x=i(1454),v=i.n(x),_=i(7654),g=i(8131),m=i(392),S=(i(3894),i(8917)),k=i(5087);function w(e,t,i,r){i&&Object.defineProperty(e,t,{enumerable:i.enumerable,configurable:i.configurable,writable:i.writable,value:i.initializer?i.initializer.call(r):void 0})}function P(e,t,i,r,c){var n={};return Object.keys(r).forEach((function(e){n[e]=r[e]})),n.enumerable=!!n.enumerable,n.configurable=!!n.configurable,("value"in n||n.initializer)&&(n.writable=!0),n=i.slice().reverse().reduce((function(i,r){return r(e,t,i)||i}),n),c&&void 0!==n.initializer&&(n.value=n.initializer?n.initializer.call(c):void 0,n.initializer=void 0),void 0===n.initializer?(Object.defineProperty(e,t,n),null):n}r=(0,S.EM)("firefox-condition"),c=(0,S.MZ)({attribute:!1}),n=(0,S.MZ)({attribute:!1}),a=(0,S.MZ)(),r(((p=class extends y.WF{constructor(...e){super(...e),w(this,"onSwitch",l,this),w(this,"onActionClick",d,this),this.isOn=!1,this.label="",this.text="",this.actionText="",w(this,"actionUrl",f,this)}static get properties(){return{isOn:{type:Boolean},label:{type:String},text:{type:String},actionText:{type:String}}}render(){return y.qy`
      <div class="FF_switch_row">
        <div>
          <h2 class="Sub_header"><label for="choice">${this.label}</label></h2>
          <p class="Text" id="description">${this.text}<a href="${this.actionUrl}"
            @click="${e=>{e.preventDefault(),this.onActionClick()}}"
            >${this.actionText}</a></p>
        </div>
        <input id="choice" type="checkbox" role="switch" aria-describedby="description"
          .checked="${this.isOn}" @change="${this.onSwitch}" />
      </div>`}}).styles=[k.A,y.AH`
    .Text { color: var(--text-dim); font-size: 14px; line-height: 1.65; margin-top: 12px; }
    .Sub_header { font-size: 18px; }
    .FF_switch_row { display: grid; grid-template-columns: minmax(0, 1fr) 38px; gap: 24px; align-items: start; }
    input[type='checkbox'] { appearance: none; width: 38px; height: 22px; margin: 3px 0 0; background: var(--switch-off); border-radius: 20px; position: relative; }
    input::before { content: ''; display: block; width: 18px; height: 18px; margin: 2px; background: var(--knob); border-radius: 50%; }
    input:checked { background: var(--switch-on); }
    input:checked::before { transform: translateX(16px); }
  `],l=P((s=p).prototype,"onSwitch",[c],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return()=>{}}}),d=P(s.prototype,"onActionClick",[n],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return()=>{}}}),f=P(s.prototype,"actionUrl",[a],{configurable:!0,enumerable:!0,writable:!0,initializer:function(){return""}}),o=s));const A=Object.fromEntries(Object.entries({ffScreenPrivacyChoicesHeader:"ff_screen_privacy_choices_header",ffScreenPrivacyChoicesText:"ff_screen_privacy_choices_text",ffScreenStatisticalDataHeader:"ff_screen_statistical_data_header",ffScreenStatisticalDataText:"ff_screen_statistical_data_text",ffScreenIdentifiersHeader:"ff_screen_identifiers_header",ffScreenIdentifiersText:"ff_screen_identifiers_text",ffScreenPrivacyPolicyLinkText:"ff_screen_privacy_policy_link_text",ffScreenPrivacyPolicyLinkUrl:"ff_screen_privacy_policy_link_url",ffClickAccept:"click_accept_terms_and_conditions"}).map((([e,t])=>[e,(0,b.Ay)(t)])));class O extends y.WF{constructor(){super(),this.acceptedIdentifiers=!1,this.acceptedStatisticalData=!0,this.source="unknown"}static get properties(){return{acceptedIdentifiers:{type:Boolean,state:!0},acceptedStatisticalData:{type:Boolean,state:!0}}}changeIdentifiers(){this.acceptedIdentifiers=!this.acceptedIdentifiers}async changeStatisticalData(){const e=!this.acceptedStatisticalData,t=!e;this.acceptedStatisticalData=e,await g.A.set("dontSendTelemetry",t)}async clickFFPrivacyPolicy(){m.A.track("accept_policy_privacy",{type:"tab",source:this.source}),v().tabs.create(A.ffScreenPrivacyPolicyLinkUrl)}async ffAccept(){if(!this.acceptedIdentifiers)return;const e=this.acceptedIdentifiers;m.A.track("personal_optout",{enabled:e?"1":"0",type:"tab",source:this.source});const t=this.acceptedStatisticalData;m.A.track("telemetry_optout",{enabled:t?"1":"0",type:"tab",source:this.source}),m.A.track("policy_accepted",{type:"tab",source:this.source}),await g.A.set(_.O.startupConditionsAcceptedShown,!0),await g.A.set(_.O.startupAcceptConditionsPhase,2),window.close()}async firstUpdated(){this.source=await g.A.get(_.O.firefoxPolicyTabOpenedSource),m.A.track("accept_policy_view",{type:"tab",source:this.source})}render(){return y.qy`
      <tab-header></tab-header>
      <main class="FF_screen Page">
        <div>
          <h1 class="Main_header">
            ${A.ffScreenPrivacyChoicesHeader}
          </h1>
          <div class="Text FF_header_text">
            ${A.ffScreenPrivacyChoicesText}
          </div>
        </div>

        <firefox-condition
          label=${A.ffScreenStatisticalDataHeader}
          text=${A.ffScreenStatisticalDataText}
          actionText=${A.ffScreenPrivacyPolicyLinkText}
          actionUrl=${A.ffScreenPrivacyPolicyLinkUrl}
          .onActionClick=${this.clickFFPrivacyPolicy.bind(this)}
          .isOn=${this.acceptedStatisticalData}
          .onSwitch=${this.changeStatisticalData.bind(this)}
        ></firefox-condition>

        <firefox-condition
          label=${A.ffScreenIdentifiersHeader}
          text=${A.ffScreenIdentifiersText}
          actionText=${A.ffScreenPrivacyPolicyLinkText}
          actionUrl=${A.ffScreenPrivacyPolicyLinkUrl}
          .onActionClick=${this.clickFFPrivacyPolicy.bind(this)}
          .isOn=${this.acceptedIdentifiers}
          .onSwitch=${this.changeIdentifiers.bind(this)}
        ></firefox-condition>

        <div class="Button">
          <input
            type="button"
            id="accept-button"
            value="${A.ffClickAccept}"
            @click="${this.ffAccept}"
            .disabled=${!this.acceptedIdentifiers}
          />
        </div>
      </main>
    `}}O.styles=[k.A,y.AH`
    :host { --page-width: 760px; }
    .FF_header_text { color: var(--text-dim); margin-top: 16px; }
    firefox-condition { display: block; padding: 28px 0; border-bottom: 1px solid var(--line); }
    firefox-condition:first-of-type { margin-top: 12px; }
    .Button { margin-top: 32px; }
  `],customElements.define("firefox-terms-and-conditions",O),(0,h.A)("firefox_agree"),document.title=(0,b.Ay)("terms_and_conditions_ff"),(async()=>{const e=(0,u.A)();window.language=e,document.documentElement.lang=e,document.body.prepend(document.createElement("firefox-terms-and-conditions"))})()}},i={};function r(e){var c=i[e];if(void 0!==c)return c.exports;var n=i[e]={id:e,loaded:!1,exports:{}};return t[e].call(n.exports,n,n.exports,r),n.loaded=!0,n.exports}r.m=t,e=[],r.O=(t,i,c,n)=>{if(!i){var a=1/0;for(d=0;d<e.length;d++){for(var[i,c,n]=e[d],o=!0,s=0;s<i.length;s++)(!1&n||a>=n)&&Object.keys(r.O).every((e=>r.O[e](i[s])))?i.splice(s--,1):(o=!1,n<a&&(a=n));if(o){e.splice(d--,1);var l=c();void 0!==l&&(t=l)}}return t}n=n||0;for(var d=e.length;d>0&&e[d-1][2]>n;d--)e[d]=e[d-1];e[d]=[i,c,n]},r.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return r.d(t,{a:t}),t},r.d=(e,t)=>{for(var i in t)r.o(t,i)&&!r.o(e,i)&&Object.defineProperty(e,i,{enumerable:!0,get:t[i]})},r.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),r.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.nmd=e=>(e.paths=[],e.children||(e.children=[]),e),r.j=360,(()=>{var e={360:0};r.O.j=t=>0===e[t];var t=(t,i)=>{var c,n,[a,o,s]=i,l=0;if(a.some((t=>0!==e[t]))){for(c in o)r.o(o,c)&&(r.m[c]=o[c]);if(s)var d=s(r)}for(t&&t(i);l<a.length;l++)n=a[l],r.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return r.O(d)},i=self.webpackChunkbrowsec_extension=self.webpackChunkbrowsec_extension||[];i.forEach(t.bind(null,0)),i.push=t.bind(null,i.push.bind(i))})();var c=r.O(void 0,[76],(()=>r(7172)));c=r.O(c)})();