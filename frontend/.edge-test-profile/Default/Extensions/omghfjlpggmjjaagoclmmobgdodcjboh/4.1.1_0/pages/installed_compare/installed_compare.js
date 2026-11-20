(()=>{"use strict";var e,t={9087(e,t,a){a(5564);var i=a(5087),r=a(7130),n=a(1743),s=a(1927),o=a(392);const c=864e5,l=(e,t,a,i)=>{const r=((e,t)=>{const a=e-t;return a>=2*c?null:Math.max(1,Math.ceil(a/c))})(t,a);return r?e("promo_days_left_"+((e,t)=>{if("ru"===t||"uk"===t){const t=e%10,a=e%100;return 1===t&&11!==a?"one":t>=2&&t<=4&&(a<12||a>14)?"few":"many"}return 1===e?"one":"many"})(r,i),[String(r)]):null},d=e=>e+"%",p=(e,t)=>{const[a,i=""]=e(t,[""]).split("");return[a,i]};var m=a(5387);a(3894);Object.defineProperty(f,"name",{value:"default",configurable:!0});const u=Object.fromEntries(Object.entries({title:"installed_compare_title",subtitle:"installed_compare_subtitle",description:"installed_compare_description",free:"installed_compare_free",freePrice:"installed_compare_free_price",premium:"installed_compare_premium",encryption:"installed_compare_encryption",noAds:"installed_compare_no_ads",speed:"installed_compare_speed",servers:"installed_compare_servers",desktopApp:"installed_compare_desktop_app",continueFree:"installed_compare_continue_free",getPremium:"installed_compare_get_premium",ruFreeIssue:"installed_compare_ru_free_issue",ruPremiumStable:"installed_compare_ru_premium_stable"}).map((([e,t])=>[e,(0,r.Ay)(t)]))),v="ru"===(0,n.A)(),h={12:"installed_compare_offer_total_annual",24:"installed_compare_offer_total_biennial"},g=(e,t)=>{const a=new Intl.NumberFormat("RUB"===t?"ru-RU":"en-US",{minimumFractionDigits:Number.isInteger(e)?0:2,maximumFractionDigits:2}).format(e);return"RUB"===t?s.qy`<span class="money">${a}<span class="currency">&nbsp;₽</span></span>`:s.qy`<span class="money"><span class="currency">$</span>${a}</span>`};function f(){const{sale:e}=this,t=(null==e?void 0:e.id)||"default",a=null==e?void 0:e.offer,n=null!=e&&e.deadline?s.qy`<span class="sale-deadline">${e.deadline}</span>`:"",c=!a||Boolean(n),l=s.qy`
    <a class="card-button premium-button ButtonLink"
      aria-disabled="${!this.premiumLink}"
      href="${this.premiumLink}"
      target="_blank" rel="noopener"
      @click="${e=>function(e,t){e.currentTarget.getAttribute("href")?o.A.track("congrats_tab_click",{campaign:t}):e.preventDefault()}(e,t)}">
      ${u.getPremium}
    </a>`;return s.qy`
  <style>
${i.A}

  :host { --page-width: 960px; }
  .In { max-width: var(--page-width); margin: 0 auto; padding: 56px var(--page-gutter) 72px; }
  .Header { max-width: 700px; margin-bottom: 36px; }
  .Subtitle { margin-top: 16px; font-size: 18px; font-weight: 500; }
  .Description { margin-top: 8px; color: var(--text-dim); }
  .cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; }
  .card { position: relative; display: flex; flex-direction: column; padding: 28px; border: 1px solid var(--line-2); border-radius: 10px; }
  .card:last-child { border-color: var(--accent-ring); background: var(--accent-soft); }
  .with-sale .cards { padding-top: 42px; }
  .card.sale { border-top-left-radius: 0; border-top-right-radius: 0; }
  .card.sale-themed { border-color: rgba(var(--promo-tint-rgb), var(--promo-line-alpha)); background: rgba(var(--promo-tint-rgb), var(--promo-surface-alpha)); }
  .sale-tab { position: absolute; left: -1px; right: -1px; bottom: 100%; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 2px 16px; min-height: 42px; padding: 9px 28px; border-radius: 10px 10px 0 0; background: var(--sale-ribbon-bg, linear-gradient(90deg, var(--brand), var(--accent))); color: var(--sale-ribbon-text, var(--action-text)); font-size: 14px; font-weight: 600; line-height: 20px; }
  .sale-tab-name { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
  .sale-tab-name > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sale-tab svg { flex: none; }
  .sale-tab-discount { white-space: nowrap; }
  .sale-deadline { color: var(--text); font-weight: 500; }
  .card-header { margin-bottom: 24px; }
  .card-title { font-size: 26px; font-weight: 600; line-height: 1.3; }
  .card-subtitle { min-height: 1.6em; color: var(--text-dim); font-size: 14px; margin-top: 6px; }
  .price-placeholder { display: inline-block; width: 9em; height: 1em; vertical-align: -.15em; border-radius: 4px; background: var(--line-2); }
  @media (prefers-reduced-motion: no-preference) { .price-placeholder { animation: price-pulse 1s ease-in-out infinite alternate; } }
  @keyframes price-pulse { to { opacity: .4; } }
  .card-items { display: flex; flex-direction: column; gap: 12px; }
  .card-item { display: flex; align-items: center; gap: 12px; font-size: 15px; }
  .card-item-icon { display: grid; place-items: center; flex: 0 0 20px; width: 20px; height: 20px; color: var(--accent); font-weight: 600; line-height: 1; text-align: center; }
  .card-item-icon.unavailable { color: var(--text-mute); font-size: 20px; }
  .card-item-icon.warning { color: var(--warn); font-size: 20px; }
  .card-actions { margin-top: auto; padding-top: 32px; }
  .card-button { display: block; width: 100%; }
  .free-button { background: var(--bg); color: var(--text); border: 1px solid var(--line-2); }
  .free-button:hover { background: var(--surface-2); }
  .premium-button[aria-disabled='true'] { opacity: .6; cursor: wait; }
  .card-actions { container-type: inline-size; }
  .checkout { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 16px 20px; padding-top: 22px; border-top: 1px dashed var(--line-2); }
  .checkout .card-button { width: auto; min-width: 180px; }
  .checkout-old { display: flex; align-items: center; gap: 8px; }
  .price-old { color: var(--text-dim); font-size: 18px; font-weight: 500; white-space: nowrap; text-decoration: line-through 2px var(--sale-accent); }
  .discount-chip { padding: 2px 7px; border-radius: 5px; background: var(--sale-ribbon-bg, var(--brand)); color: var(--sale-ribbon-text, var(--action-text)); font-size: 13px; font-weight: 700; line-height: 18px; white-space: nowrap; }
  .price-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 10px; }
  .price-now { font-size: 38px; font-weight: 700; line-height: 1.15; letter-spacing: -.035em; white-space: nowrap; }
  .price-now .currency { font-size: .58em; font-weight: 600; letter-spacing: 0; }
  .price-unit { color: var(--text-dim); font-size: 15px; }
  .price-note { margin-top: 2px; color: var(--text-dim); font-size: 13px; }
  .price-note .money { color: var(--text); font-weight: 600; white-space: nowrap; }
  .card { --sale-accent: var(--accent); }
  .card.sale-themed { --sale-accent: rgb(var(--promo-tint-rgb)); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  @container (max-width: 369px) { .checkout { grid-template-columns: minmax(0, 1fr); } .checkout .card-button { width: 100%; } }
  @media (max-width: 660px) { .In { padding: 32px var(--page-gutter) 48px; } .cards { grid-template-columns: minmax(0, 1fr); gap: 20px; } .card { padding: 24px; }
    .with-sale .cards { padding-top: 0; } .card.sale { border-radius: 10px; } .sale-tab { position: static; margin: -25px -25px 20px; padding: 9px 24px; border-radius: 9px 9px 0 0; } .sale-tab-name > span { white-space: normal; } }

  </style>

  <tab-header></tab-header>
  <main class="In">
    <div class="Header">
      <h1 class="Title">${u.title}</h1>
      <div class="Subtitle">${u.subtitle}</div>
      <div class="Description">${u.description}</div>
    </div>

    <div class="compare-cards ${e?"with-sale":""}">
      <div class="cards">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">${u.free}</h2>
            ${c?s.qy`<div class="card-subtitle">${a?"":u.freePrice}</div>`:""}
          </div>

          <div class="card-items">
            ${v?s.qy`
              <div class="card-item">
                <div class="card-item-icon warning" aria-hidden="true">!</div>
                <div class="card-item-text">${u.ruFreeIssue}</div>
              </div>`:""}
            <div class="card-item">
              <div class="card-item-icon" role="img" aria-label="${(0,r.Ay)("feature_included")}">✓</div>
              <div class="card-item-text">${u.encryption}</div>
            </div>
            <div class="card-item">
              <div class="card-item-icon" role="img" aria-label="${(0,r.Ay)("feature_included")}">✓</div>
              <div class="card-item-text">${u.noAds}</div>
            </div>
            <div class="card-item">
              <div class="card-item-icon unavailable" role="img" aria-label="${(0,r.Ay)("feature_not_included")}">–</div>
              <div class="card-item-text">${u.speed}</div>
            </div>
            <div class="card-item">
              <div class="card-item-icon unavailable" role="img" aria-label="${(0,r.Ay)("feature_not_included")}">–</div>
              <div class="card-item-text">${u.servers}</div>
            </div>
            <div class="card-item">
              <div class="card-item-icon unavailable" role="img" aria-label="${(0,r.Ay)("feature_not_included")}">–</div>
              <div class="card-item-text">${u.desktopApp}</div>
            </div>
          </div>

          <div class="card-actions">
            <a class="card-button free-button ButtonLink" href="/pages/congratulations/congratulations.html" @click="${e=>function(e,t){e.preventDefault(),o.A.track("congrats_tab_free",{campaign:t}),window.location.href="/pages/congratulations/congratulations.html"}(e,t)}">
              ${u.continueFree}
            </a>
          </div>
        </div>

        <div class="card ${e?"sale":""} ${e&&Object.keys(e.styleVars).length?"sale-themed":""}"
          style="${(0,m.W)((null==e?void 0:e.styleVars)||{})}">
          ${e?s.qy`
            <div class="sale-tab">
              <span class="sale-tab-name" title="${e.name}">${((e=12)=>s.qy`<svg width="${e}" height="${e}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18.5 5.5 5.5 18.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="7" cy="7" r="2.8" stroke="currentColor" stroke-width="2.4"/><circle cx="17" cy="17" r="2.8" stroke="currentColor" stroke-width="2.4"/></svg>`)(14)}<span>${e.name}</span></span>
              <span class="sale-tab-discount">${(0,r.Ay)("installed_compare_sale_discount",[e.discount])}</span>
            </div>`:""}
          <div class="card-header">
            <h2 class="card-title">${u.premium}</h2>
            ${c?s.qy`
              <div class="card-subtitle" aria-busy="${!this.premiumPrice}">
                ${(()=>this.premiumPrice?a?n:s.qy`${(0,r.Ay)("installed_compare_premium_price",[this.premiumPrice])}
                    ${n?s.qy`<span aria-hidden="true">·</span> ${n}`:""}`:s.qy`<span class="price-placeholder"></span>`)()}
              </div>`:""}
          </div>

          <div class="card-items">
            ${v?s.qy`
              <div class="card-item">
                <div class="card-item-icon" role="img" aria-label="${(0,r.Ay)("feature_included")}">✓</div>
                <div class="card-item-text">${u.ruPremiumStable}</div>
              </div>`:""}
            <div class="card-item">
              <div class="card-item-icon" role="img" aria-label="${(0,r.Ay)("feature_included")}">✓</div>
              <div class="card-item-text">${u.encryption}</div>
            </div>
            <div class="card-item">
              <div class="card-item-icon" role="img" aria-label="${(0,r.Ay)("feature_included")}">✓</div>
              <div class="card-item-text">${u.noAds}</div>
            </div>
            <div class="card-item">
              <div class="card-item-icon" role="img" aria-label="${(0,r.Ay)("feature_included")}">✓</div>
              <div class="card-item-text">${u.speed}</div>
            </div>
            <div class="card-item">
              <div class="card-item-icon" role="img" aria-label="${(0,r.Ay)("feature_included")}">✓</div>
              <div class="card-item-text">${u.servers}</div>
            </div>
            <div class="card-item">
              <div class="card-item-icon" role="img" aria-label="${(0,r.Ay)("feature_included")}">✓</div>
              <div class="card-item-text">${u.desktopApp}</div>
            </div>
          </div>

          <div class="card-actions">
            ${a?((e,t)=>{const[a,i]=p(r.Ay,"installed_compare_offer_price"),n=h[e.months],[o,c]=n?p(r.Ay,n):["",""];return s.qy`
  <div class="checkout">
    <div class="checkout-price">
      <div class="checkout-old">
        <span class="sr-only">${(0,r.Ay)("installed_compare_offer_old_price")}</span>
        <s class="price-old">${g(e.oldPrice,e.currency)}</s>
        <span class="discount-chip">−${e.discount}</span>
      </div>
      <div class="price-row">
        ${a.trim()?s.qy`<span class="price-unit">${a.trim()}</span>`:""}
        <span class="price-now">${g(e.price,e.currency)}</span>
        ${i.trim()?s.qy`<span class="price-unit">${i.trim()}</span>`:""}
      </div>
      ${n?s.qy`<div class="price-note">${o}${g(e.total,e.currency)}${c}</div>`:""}
    </div>
    ${t}
  </div>`})(a,l):l}
          </div>
        </div>
      </div>
    </div>
  </main>`}var b=a(680),x=a(8760),y=a(8762),_=a(3602),w=a(556),$=a(8131);const k=new class{constructor(){this._timeoutIds={},this._cachedTimemarks={},this._ready=(async()=>{this._state=await $.A.get("timemarks")||{}})()}async get(e){if(await this._ready,"object"!=typeof this._state)throw new Error(`Timemark for ${e} called before storage initialization`);return this._state[e]}async getAsync(e){return(await $.A.get("timemarks")||{})[e]}waitAsync(e,t){return new Promise((a=>{let i,r=()=>{};const n=e=>{clearTimeout(i),r(),a(e)};r=$.A.onChange({for:["timemarks"],do:({timemarks:t})=>{null!=t&&t[e]&&n(t[e])}}),i=setTimeout((()=>{n()}),t),this.getAsync(e).then((e=>{e&&n(e)}))}))}async set(e,t=Date.now()){await this._ready,this._state[e]=t,$.A.set("timemarks",this._state)}async getCached(e){if(void 0!==this._cachedTimemarks[e])return this._cachedTimemarks[e];const t=await this.get(e);return void 0!==t&&(this._cachedTimemarks[e]=t),t}setCached(e,t=Date.now()){this._cachedTimemarks[e]=t,this.set(e,t)}async start({action:e,delay:t,getOldMark:a=()=>{},name:i}){await this._ready;const r=await this.get(i)||a(),n=r?Date.now()-r:void 0;return!r||"number"==typeof n&&(n<0||n>=t)?{startImmediately:!0,actionPromise:e()}:("number"==typeof n&&(void 0!==this._timeoutIds[i]&&clearTimeout(this._timeoutIds[i]),this._timeoutIds[i]=setTimeout(e,t-n)),{startImmediately:!1})}async loop({action:e,delay:t,name:a}){(await this.start({action:e,delay:t,name:a})).startImmediately&&this.set(a)}async waitTimestamp(e,t=15e3,a=100){await this._ready;const i=await this.get(e);return i?((0,y.A)(`waitTimestamp: "${e}" is already set`),i):new Promise((i=>{(0,y.A)(`waitTimestamp: wait "${e}"`);const r=setInterval((async()=>{const t=await this.get(e);t&&((0,y.A)(`waitTimestamp: "${e}" got`),clearInterval(r),i(t))}),a);setTimeout((()=>{(0,y.A)(`waitTimestamp: "${e}" timeout`),clearInterval(r),i(void 0)}),t)}))}};var A=a(9110),P=a(8420);var T=a(8985);const S="#ffffff",M="#101a34",O=e=>{const t=parseInt(e.slice(1),16);return[t>>16&255,t>>8&255,255&t]},I=e=>O(e).join(", "),q=(e,t,a)=>{const i=O(e),r=O(t);return"#"+i.map(((e,t)=>e+(r[t]-e)*a)).map((e=>("0"+Math.round(e).toString(16)).slice(-2))).join("")},j=e=>{const[t,a,i]=O(e).map((e=>{const t=e/255;return t<=.03928?t/12.92:((t+.055)/1.055)**2.4}));return.2126*t+.7152*a+.0722*i},z=(e,t)=>{const[a,i]=[j(e),j(t)].sort(((e,t)=>t-e));return(a+.05)/(i+.05)},C=({gradientFrom:e,gradientText:t},a)=>t&&z(e,t)>=a?t:void 0,D=(e,t=4.5)=>{const{gradientFrom:a}=e,i=C(e,t)||(z(a,S)>=z(a,M)?S:M),r=j(i)>j(a)?"#000000":S,n=q(a,r,.55);return{text:i,from:z(a,i)>=t?a:q(a,r,.3),to:n}},F=(e,t)=>{var a;const i="ru"===t?"RUB":"USD",r=e=>{var t;return null==e||null===(t=e.prices.find((e=>e.currency===i)))||void 0===t?void 0:t.value},n=r(null===(a=e.baseTariffs)||void 0===a?void 0:a.find((({kind:e})=>"monthly"===e)));if(!n)return null;const s=(e.tariffs||[]).flatMap((e=>{const t=r(e);return t?[{tariff:e,total:t,perMonth:t/(0,P.A)(e.duration)}]:[]})).reduce(((e,t)=>!e||t.perMonth<e.perMonth?t:e),null);if(!s)return null;const o=Math.round(100*(1-s.perMonth/n));return o<1||o>99?null:{currency:i,plan:s.tariff.kind,months:s.tariff.duration,price:"RUB"===i?Math.floor(s.perMonth):Math.floor(100*s.perMonth)/100,oldPrice:n,total:s.total,discount:d(o)}},E=(e,t,a)=>{var i;const n=((e,t)=>e.find((({from:e,till:a,tariffs:i})=>e<=t&&t<=a&&Boolean(null==i?void 0:i.length))))(e,t);if(!n)return null;const s=(0,T.OK)(n.presentation)?n.presentation:void 0,o=null!==(i=n.discountMax)&&void 0!==i?i:null==s?void 0:s.discountMax;return o?{id:n.id,name:s?(0,T.t2)(s.names,a):(0,r.Ay)("installed_compare_sale_generic"),discount:d(o),deadline:l(r.Ay,n.till,t,a),styleVars:(()=>{if(!s)return{};const{from:e,to:t,text:a}=((e,t=4.5)=>{const a=D(e,t);return{text:a.text,from:a.from,to:q(a.from,a.to,.35)}})(s.styles);return{"--sale-ribbon-bg":`linear-gradient(90deg, ${e}, ${t})`,"--sale-ribbon-text":a,"--promo-tint-rgb":I(s.styles.primary)}})(),offer:F(n,a)}:null};var B=a(5292);class L extends s.WF{render(){return f.call(this)}static get properties(){return{premiumLink:{type:String},premiumPrice:{type:String},sale:{attribute:!1}}}constructor(){super(),this.premiumLink="",this.premiumPrice="",this.sale=null;const e=(async()=>{const e=await(async()=>(await k.waitAsync("promotions",5e3)||(0,y.A)("installed_compare: no promotions in 5000 ms, default prices"),b.A.getStateAsync()))();return{storeState:e,sale:E(e.promotions,Date.now(),(0,n.A)())}})();(async()=>{const{storeState:{prices:t,priceTrial:a},sale:i}=await e,r="ru"===(0,n.A)()?"ru":"en";this.premiumPrice=(0,w.A)({language:r,prices:t,priceTrial:a}).priceString,this.sale=i,i&&(await this.updateComplete,await $.A.set("installCompareSale",i.id))})(),(async t=>{const[{storeState:a,sale:i},r,s]=await Promise.all([e,x.A.full.userIdPromise,B.Pc.getEngagedEnabledExpvarid()]),o=(0,n.A)();this.premiumLink=(0,A.u4)({action:e=>Object.assign(e,{utm_source:"chromium extension",utm_medium:"congrats_tab",utm_campaign:(null==i?void 0:i.id)||"default_campaign"}),storeState:a,url:`${_.A.base}/${o}/orders/new?plan_id=${(null==i||null===(t=i.offer)||void 0===t?void 0:t.plan)||"biennial"}&cid=${r}`,expvarid:s})})()}}customElements.define("compare-block",L);(0,a(636).A)("installed_compare"),document.title=(0,r.Ay)("installed_compare_title"),(async()=>{let e=await $.A.get("congrats_number")||0;e++,o.A.track("congrats_tab_open",{congrats_number:e.toString()}),await $.A.set("congrats_number",e)})(),$.A.set("installCompareShown",!0);const U=new Promise((e=>{window.addEventListener("DOMContentLoaded",(()=>{e()}))}));(async e=>{await b.A.initiate();const t=(0,n.A)();window.language=t,document.documentElement.lang=t,await U;const a=document.querySelector("div.Main > div.In");null==a||null===(e=a.append)||void 0===e||e.call(a,document.createElement("compare-block"))})()}},a={};function i(e){var r=a[e];if(void 0!==r)return r.exports;var n=a[e]={id:e,loaded:!1,exports:{}};return t[e].call(n.exports,n,n.exports,i),n.loaded=!0,n.exports}i.m=t,e=[],i.O=(t,a,r,n)=>{if(!a){var s=1/0;for(d=0;d<e.length;d++){for(var[a,r,n]=e[d],o=!0,c=0;c<a.length;c++)(!1&n||s>=n)&&Object.keys(i.O).every((e=>i.O[e](a[c])))?a.splice(c--,1):(o=!1,n<s&&(s=n));if(o){e.splice(d--,1);var l=r();void 0!==l&&(t=l)}}return t}n=n||0;for(var d=e.length;d>0&&e[d-1][2]>n;d--)e[d]=e[d-1];e[d]=[a,r,n]},i.n=e=>{var t=e&&e.__esModule?()=>e.default:()=>e;return i.d(t,{a:t}),t},i.d=(e,t)=>{for(var a in t)i.o(t,a)&&!i.o(e,a)&&Object.defineProperty(e,a,{enumerable:!0,get:t[a]})},i.g=function(){if("object"==typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"==typeof window)return window}}(),i.o=(e,t)=>Object.prototype.hasOwnProperty.call(e,t),i.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},i.nmd=e=>(e.paths=[],e.children||(e.children=[]),e),i.j=683,(()=>{var e={683:0};i.O.j=t=>0===e[t];var t=(t,a)=>{var r,n,[s,o,c]=a,l=0;if(s.some((t=>0!==e[t]))){for(r in o)i.o(o,r)&&(i.m[r]=o[r]);if(c)var d=c(i)}for(t&&t(a);l<s.length;l++)n=s[l],i.o(e,n)&&e[n]&&e[n][0](),e[n]=0;return i.O(d)},a=self.webpackChunkbrowsec_extension=self.webpackChunkbrowsec_extension||[];a.forEach(t.bind(null,0)),a.push=t.bind(null,a.push.bind(a))})();var r=i.O(void 0,[76],(()=>i(9087)));r=i.O(r)})();