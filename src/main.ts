import './styles.css';
import { reviewCategories, reviewQuestions, type ReviewQuestion } from './questions';

type FontKey = keyof typeof defaults;
const storageKey = 'review-question-bank-font-sizes-v1';
const defaults = {
  heroTitle: 20, heroSubtitle: 16, toolbarText: 20, listTitle: 24,
  listSummary: 18, questionTitle: 30, questionBody: 22, shortAnswer: 30,
  mechanismText: 24, noteText: 18, footerText: 18, categoryTag: 18,
  sectionLabel: 14, noteHeading: 20,
};
const controls: Array<[FontKey, string, string, number, number]> = [
  ['heroTitle','页面主标题','复习页顶部标题',20,44], ['heroSubtitle','页面说明','标题下说明',12,24],
  ['toolbarText','搜索与筛选','搜索、分类按钮',12,20], ['categoryTag','分类标签字体','分类标签',10,18],
  ['listTitle','问题列表标题','题目名称',12,24], ['listSummary','问题列表预览','问题正文预览',11,22],
  ['sectionLabel','答案区块标题','参考答案、机制链',11,22], ['questionTitle','问题标题','问题大标题',22,42],
  ['questionBody','问题正文','问题正文',14,30], ['shortAnswer','参考答案正文','参考答案正文',14,34],
  ['mechanismText','机制链正文','推导步骤',14,30], ['noteHeading','条件/误区标题','成立条件、常见误区',13,26],
  ['noteText','条件/误区正文','条件与误区',13,26], ['footerText','页面底部说明','整理依据',11,18],
];

let fonts = loadFonts();
let query = '';
let category = '全部';
let selectedId = reviewQuestions[0].id;
let mobileDetail = false;
let savedScrollY = 0;
let answerRevealed = false;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]!));
}
function loadFonts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return Object.fromEntries(Object.entries(defaults).map(([key, value]) => {
      const control = controls.find(([item]) => item === key);
      const candidate = Number(parsed[key]);
      return [key, control && Number.isFinite(candidate) ? Math.min(control[4], Math.max(control[3], Math.round(candidate))) : value];
    })) as typeof defaults;
  } catch { return {...defaults}; }
}
function applyFonts() {
  for (const [key, value] of Object.entries(fonts)) document.documentElement.style.setProperty(`--${key}`, `${value}px`);
}
function filtered() {
  const needle = query.trim().toLowerCase();
  return reviewQuestions.filter((item) => (category === '全部' || item.category === category) && (!needle || `${item.title} ${item.question} ${item.shortAnswer}`.toLowerCase().includes(needle)));
}
function icon(name: 'search'|'chevron'|'back'|'settings') {
  const paths = {
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>', back:'<path d="m15 18-6-6 6-6"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.15.37.38.7.69.95.3.25.69.4 1.1.4H21v4h-.09c-.4 0-.8.15-1.1.4-.3.25-.54.58-.69.95Z"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}
function listHtml(items: ReviewQuestion[]) {
  return items.map((item, index) => `<button class="question-item ${item.id === selectedId ? 'active':''}" data-question="${item.id}">
    <span class="number">${String(index + 1).padStart(2,'0')}</span><span class="question-copy"><span class="category">${item.category}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.question)}</small></span>${icon('chevron')}</button>`).join('');
}
function answerHtml(item?: ReviewQuestion, index = -1, total = 0) {
  if (!item) return '<section class="empty">没有匹配的问题，请缩短关键词或切换到“全部”。</section>';
  const details = answerRevealed ? `
  <section class="answer-highlight"><h3>参考答案</h3><p>${escapeHtml(item.shortAnswer)}</p></section>
  <section class="mechanism"><h3>机制链</h3><ol>${item.mechanism.map((step, i) => `<li><span>${i+1}</span><p>${escapeHtml(step)}</p></li>`).join('')}</ol></section>
  <div class="notes"><section class="condition"><h3>✓ 成立条件</h3><ul>${item.conditions.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section><section class="pitfall"><h3>○ 常见误区</h3><ul>${item.pitfalls.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></section></div>
  <footer><strong>整理依据：</strong>${escapeHtml(item.source)}<br>答案是当前学习材料的参考解释；条件变化时，应重新判断而不是背诵方向。</footer>` : '<button id="reveal-answer" class="reveal-answer" aria-expanded="false">显示答案</button>';
  return `<article class="answer-card"><span class="answer-category">${item.category}</span><h2>${escapeHtml(item.title)}</h2><p class="question-body">${escapeHtml(item.question)}</p>
  ${details}</article>
  <nav class="mobile-nav" aria-label="答案页导航"><button id="previous" ${index <= 0 ? 'disabled':''}>上一题</button><button id="next" ${index >= total-1 ? 'disabled':''}>下一题</button></nav>`;
}
function renderReview() {
  const items = filtered();
  if (!items.some(x => x.id === selectedId)) selectedId = items[0]?.id || '';
  const selected = items.find(x => x.id === selectedId);
  const selectedIndex = items.findIndex(x => x.id === selectedId);
  document.querySelector('#app')!.innerHTML = `<header class="${mobileDetail ? 'detail-active' : ''}"><div class="brand-content"><div class="logo">复</div><strong>复习题库</strong></div><div class="mobile-header-return"><button id="back">${icon('back')}返回列表</button><span>${selectedIndex + 1} / ${items.length}</span></div></header><main class="page ${mobileDetail ? 'show-detail':'show-list'}">
    <section class="hero"><div><span>只读复习资料</span><h1>问题与参考答案 <b>${reviewQuestions.length} 道</b></h1><p>选择一个问题，查看答案、机制和易错点。</p></div><button id="open-settings" class="settings-button">${icon('settings')}字体设置</button></section>
    <div class="layout"><aside class="question-panel"><section class="toolbar"><label>${icon('search')}<input id="search" value="${escapeHtml(query)}" placeholder="搜索：长债、通胀、黄金……"></label><div>${reviewCategories.map(x=>`<button class="filter ${x===category?'active':''}" data-category="${x}">${x}</button>`).join('')}</div><small>显示 ${items.length} / ${reviewQuestions.length}</small></section><div class="question-list">${listHtml(items)}</div></aside><section class="answer-panel">${answerHtml(selected, selectedIndex, items.length)}</section></div></main>`;
  bindReview(items);
}
function bindReview(items: ReviewQuestion[]) {
  document.querySelector<HTMLInputElement>('#search')?.addEventListener('input', e => { query=(e.target as HTMLInputElement).value; renderReview(); document.querySelector<HTMLInputElement>('#search')?.focus(); });
  document.querySelectorAll<HTMLElement>('[data-category]').forEach(el => el.onclick=()=>{category=el.dataset.category!; renderReview();});
  document.querySelectorAll<HTMLElement>('[data-question]').forEach(el => el.onclick=()=>{savedScrollY=scrollY; selectedId=el.dataset.question!; answerRevealed=false; mobileDetail=true; renderReview(); scrollTo(0,0);});
  document.querySelector<HTMLElement>('#reveal-answer')?.addEventListener('click',()=>{answerRevealed=true;renderReview();});
  const returnToList=()=>{answerRevealed=false;mobileDetail=false; renderReview(); requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo(0,savedScrollY)));};
  document.querySelector<HTMLElement>('#back')?.addEventListener('click',returnToList);
  const move=(offset:number)=>{const i=items.findIndex(x=>x.id===selectedId); if(items[i+offset]){selectedId=items[i+offset].id;answerRevealed=false;renderReview();scrollTo(0,0);}};
  document.querySelector<HTMLElement>('#previous')?.addEventListener('click',()=>move(-1)); document.querySelector<HTMLElement>('#next')?.addEventListener('click',()=>move(1));
  document.querySelector<HTMLElement>('#open-settings')!.onclick=()=>{location.hash='settings';};
}
function renderSettings() {
  document.querySelector('#app')!.innerHTML=`<header><div class="logo">复</div><strong>复习题库</strong></header><main class="page settings-page"><section class="hero"><div><span>显示偏好</span><h1>字体设置</h1><p>输入有效数值后立即应用，并自动保存在当前设备。</p></div><button id="return" class="settings-button">返回题库</button></section><div class="settings-layout"><section class="preview"><span class="category">黄金判断</span><h2 data-font="questionTitle">央行降息后，黄金一定上涨吗？</h2><p class="question-body" data-font="questionBody">仅知道“某央行降息”，不能直接判断短期黄金价格方向。</p><section class="answer-highlight"><h3 data-font="sectionLabel">参考答案</h3><p data-font="shortAnswer">需要同时检查实际收益率、美元、风险需求、仓位和流动性压力。</p></section><p class="preview-mechanism" data-font="mechanismText">降息预期 → 实际收益率可能下降 → 黄金机会成本可能下降</p><section class="condition"><h3 data-font="noteHeading">✓ 成立条件</h3><p data-font="noteText">降息未被完全提前计价，且美元没有显著走强。</p></section></section><section class="font-controls"><div class="controls-header"><div><strong>字体设置</strong><small>有效数值会自动保存</small></div><button id="reset">恢复默认字体</button></div>${controls.map(([key,label,target,min,max])=>`<label data-control="${key}"><span>${label}<small>${target}</small></span><input inputmode="numeric" value="${fonts[key]}" data-input="${key}" aria-label="${label}（${min}-${max}像素）"><em>已保存 ${fonts[key]}px · 范围 ${min}–${max}</em></label>`).join('')}</section></div></main>`;
  document.querySelector<HTMLElement>('#return')!.onclick=()=>{location.hash='';};
  document.querySelector<HTMLElement>('#reset')!.onclick=()=>{fonts={...defaults};localStorage.setItem(storageKey,JSON.stringify(fonts));applyFonts();renderSettings();};
  document.querySelectorAll<HTMLInputElement>('[data-input]').forEach(input=>{const key=input.dataset.input as FontKey; const control=controls.find(x=>x[0]===key)!; const row=input.closest('label')!; const toggle=(on:boolean)=>{row.classList.toggle('focused',on);document.querySelectorAll(`[data-font="${key}"]`).forEach(x=>x.classList.toggle('highlight',on));}; input.onfocus=()=>toggle(true); input.onmouseenter=()=>toggle(true); input.onmouseleave=()=>{if(document.activeElement!==input)toggle(false)}; input.onblur=()=>{toggle(false); const value=Math.min(control[4],Math.max(control[3],Number(input.value)||fonts[key]));fonts[key]=Math.round(value);localStorage.setItem(storageKey,JSON.stringify(fonts));applyFonts();renderSettings();}; input.oninput=()=>{const value=Number(input.value);if(value>=control[3]&&value<=control[4]){fonts[key]=Math.round(value);localStorage.setItem(storageKey,JSON.stringify(fonts));applyFonts();row.querySelector('em')!.textContent=`已保存 ${fonts[key]}px · 范围 ${control[3]}–${control[4]}`;}};});
}
function route(){location.hash==='#settings'?renderSettings():renderReview();}
applyFonts(); addEventListener('hashchange',route); route();
