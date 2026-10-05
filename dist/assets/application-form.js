(function(){
  'use strict';

  const events=(window.AssemblyEvents||[]).filter(event=>event.registrationOpen);
  const rootPrefix=document.documentElement.dataset.rootPrefix||'';
  const policyUrl=`${rootPrefix}privacy/`;
  const consentUrl=`${rootPrefix}consent/`;
  const eventOptions=events.map(event=>`<option value="${event.id}">${event.date} · ${event.title}</option>`).join('');

  document.body.insertAdjacentHTML('beforeend',`
    <dialog class="application-dialog" id="application-dialog" aria-label="Анкета Ассамблеи">
      <div class="dialog-card">
        <div class="dialog-head"><div class="dialog-progress" id="dialog-progress"><b>Заявка на участие</b> · шаг 1 из 5</div><button class="dialog-close" type="button" aria-label="Закрыть анкету" data-close-form>×</button></div>
        <div class="dialog-body" id="dialog-form-view">
          <aside class="dialog-aside" aria-hidden="true"><div><strong id="dialog-aside-title">Ваш запрос — начало разговора.</strong><p id="dialog-aside-copy">Расскажите о себе и о том, что вы хотите найти внутри среды Ассамблеи.</p></div><div class="dialog-index" id="dialog-index">01</div></aside>
          <form class="application-form" id="application-form" novalidate>
            <input type="hidden" name="application_type" id="application-type" value="participant">
            <input type="hidden" name="event_id" id="event-id">
            <input type="hidden" name="event_title" id="event-title">
            <input type="hidden" name="event_date" id="event-date">
            <input type="hidden" name="event_place" id="event-place">
            <input type="hidden" name="form_started_at" id="form-started-at">
            <input type="hidden" name="utm_source" data-attribution><input type="hidden" name="utm_medium" data-attribution><input type="hidden" name="utm_campaign" data-attribution><input type="hidden" name="utm_content" data-attribution><input type="hidden" name="utm_term" data-attribution><input type="hidden" name="yclid" data-attribution><input type="hidden" name="gclid" data-attribution><input type="hidden" name="fbclid" data-attribution><input type="hidden" name="vk_click_id" data-attribution><input type="hidden" name="attribution_landing_path" data-attribution><input type="hidden" name="attribution_referrer_origin" data-attribution><input type="hidden" name="attribution_captured_at" data-attribution>
            <label class="hp-field" aria-hidden="true">Не заполняйте это поле<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
            <fieldset class="step active" data-step="1">
              <legend>Как к вам обращаться?</legend>
              <label class="event-selector" id="event-selector"><span>Выбранное событие *</span><select id="event-select" name="registration_event">${eventOptions}</select><small id="event-summary"></small></label>
              <div class="field-grid"><label class="field"><span>ФИО / имя в сообществе *</span><input type="text" name="name" required autocomplete="name"></label><label class="field"><span>Род деятельности / профессия *</span><input type="text" name="occupation" required></label><label class="field"><span>Телефон</span><input type="tel" name="phone" autocomplete="tel"></label><label class="field"><span>Email *</span><input type="email" name="email" required autocomplete="email"></label><label class="field wide"><span>Сайт или социальная сеть</span><input type="url" name="link" placeholder="https://"></label></div>
            </fieldset>
            <fieldset class="step" data-step="2"><legend>Кого или что вы хотите найти?</legend><span class="group-label">Можно выбрать несколько вариантов</span><div class="choices" role="group" aria-label="Тип запроса"><label class="choice"><input type="checkbox" name="request" value="collaboration"><span>Коллаборацию / совместный проект</span></label><label class="choice"><input type="checkbox" name="request" value="partnership"><span>Партнёрство</span></label><label class="choice"><input type="checkbox" name="request" value="specialist"><span>Специалиста / подрядчика</span></label><label class="choice"><input type="checkbox" name="request" value="team"><span>Единомышленника / команду</span></label><label class="choice"><input type="checkbox" name="request" value="mentor"><span>Наставника / консультанта</span></label></div><label class="field free"><span>Сформулируйте свой запрос своими словами</span><textarea name="request_details" placeholder="Например: ищу партнёра для запуска проекта или эксперта в конкретной сфере"></textarea></label></fieldset>
            <fieldset class="step" data-step="3"><legend>Что вам сейчас особенно интересно?</legend><span class="group-label">Можно выбрать несколько сфер</span><div class="choices" role="group" aria-label="Интересующие сферы"><label class="choice"><input type="checkbox" name="interest" value="art"><span>Искусство</span></label><label class="choice"><input type="checkbox" name="interest" value="business"><span>Бизнес-партнёрства</span></label><label class="choice"><input type="checkbox" name="interest" value="fashion"><span>Мода</span></label><label class="choice"><input type="checkbox" name="interest" value="music"><span>Музыка</span></label><label class="choice"><input type="checkbox" name="interest" value="tech"><span>ИИ и IT-технологии</span></label><label class="choice"><input type="checkbox" name="interest" value="investment"><span>Инвестиции и капитал</span></label><label class="choice"><input type="checkbox" name="interest" value="wellness"><span>Красота и здоровье</span></label></div><label class="field free"><span>Другое направление — своими словами</span><input type="text" name="interest_other"></label></fieldset>
            <fieldset class="step" data-step="4"><legend>Как Ассамблея может вам помочь?</legend><span class="group-label">Можно выбрать несколько вариантов</span><div class="choices" role="group" aria-label="Формат содействия"><label class="choice"><input type="checkbox" name="help" value="introduction"><span>Познакомить с нужными людьми</span></label><label class="choice"><input type="checkbox" name="help" value="announce"><span>Анонсировать запрос</span></label><label class="choice"><input type="checkbox" name="help" value="feedback"><span>Дать обратную связь по идее</span></label></div><label class="field free"><span>Расскажите подробнее</span><textarea name="help_details"></textarea></label></fieldset>
            <fieldset class="step" data-step="5"><legend>Как вам удобнее продолжить знакомство?</legend><div class="choices" role="radiogroup" aria-label="Предпочтительный следующий шаг"><label class="choice"><input type="radio" name="next_step" value="personal-invitation" required><span>Получить личное приглашение на встречу</span></label><label class="choice"><input type="radio" name="next_step" value="one-to-one"><span>Обсудить участие один на один</span></label><label class="choice"><input type="radio" name="next_step" value="announcements"><span>Получать анонсы будущих событий</span></label></div><label class="consent"><input type="checkbox" name="consent" required><span>Я ознакомлен(а) с <a href="${policyUrl}" target="_blank" rel="noopener noreferrer">Политикой обработки персональных данных</a> и даю отдельное <a href="${consentUrl}" target="_blank" rel="noopener noreferrer">согласие на обработку персональных данных</a> для рассмотрения заявки и связи со мной. *</span></label><p class="preview-note">После отправки выбранное событие и все ответы поступят команде Ассамблеи на почту проекта. Данные не публикуются и не передаются в CRM.</p></fieldset>
            <p class="form-error" id="form-error" role="alert" aria-live="polite"></p>
            <div class="dialog-actions"><button class="button ghost" id="back-button" type="button" hidden>Назад</button><button class="button" id="next-button" type="button">Далее <span aria-hidden="true">→</span></button><button class="button" id="submit-button" type="submit" hidden>Отправить заявку <span aria-hidden="true">→</span></button></div>
          </form>
        </div>
        <section class="dialog-success" id="dialog-success" role="status" tabindex="-1"><div class="dialog-progress">Анкета заполнена</div><h2 id="success-title">Спасибо. Запрос собран.</h2><p id="success-copy"></p><button class="button dark" type="button" data-close-form>Вернуться на сайт</button></section>
      </div>
    </dialog>`);

  const dialog=document.getElementById('application-dialog');
  const form=document.getElementById('application-form');
  const formView=document.getElementById('dialog-form-view');
  const successView=document.getElementById('dialog-success');
  const steps=[...form.querySelectorAll('.step')];
  const progress=document.getElementById('dialog-progress');
  const index=document.getElementById('dialog-index');
  const error=document.getElementById('form-error');
  const backButton=document.getElementById('back-button');
  const nextButton=document.getElementById('next-button');
  const submitButton=document.getElementById('submit-button');
  const applicationType=document.getElementById('application-type');
  const eventSelector=document.getElementById('event-selector');
  const eventSelect=document.getElementById('event-select');
  const asideTitle=document.getElementById('dialog-aside-title');
  const asideCopy=document.getElementById('dialog-aside-copy');
  let currentStep=0;
  let formMode='participant';

  function getEvent(eventId){return events.find(event=>event.id===eventId)||events[0]||null}
  function formTitle(){return formMode==='guest'?'Регистрация на событие':'Заявка на участие'}
  function setEvent(eventId){
    const selected=getEvent(eventId);
    if(!selected)return;
    const when=[selected.date,selected.time].filter(Boolean).join(' · ');
    eventSelect.value=selected.id;
    document.getElementById('event-id').value=selected.id;
    document.getElementById('event-title').value=selected.title;
    document.getElementById('event-date').value=when;
    document.getElementById('event-place').value=selected.place;
    document.getElementById('event-summary').textContent=`${when} · ${selected.place}`;
    asideTitle.textContent=selected.title;
    asideCopy.textContent=`${when}. ${selected.place}. Выбранное событие будет указано в заявке.`;
  }
  function renderStep(){
    steps.forEach((step,i)=>step.classList.toggle('active',i===currentStep));
    progress.innerHTML=`<b>${formTitle()}</b> · шаг ${currentStep+1} из ${steps.length}`;
    index.textContent=String(currentStep+1).padStart(2,'0');
    backButton.hidden=currentStep===0;
    nextButton.hidden=currentStep===steps.length-1;
    submitButton.hidden=currentStep!==steps.length-1;
    error.textContent='';
    const target=steps[currentStep].querySelector('select:not(:disabled),input:not([type="hidden"]),textarea');
    if(target)requestAnimationFrame(()=>target.focus({preventScroll:true}));
  }
  function validateCurrentStep(){
    const required=[...steps[currentStep].querySelectorAll('[required]:not(:disabled)')];
    const invalid=required.find(field=>!field.checkValidity());
    if(invalid){error.textContent='Пожалуйста, заполните обязательные поля этого шага.';invalid.reportValidity();invalid.focus();return false}
    return true;
  }
  function applyAttribution(){
    const attribution=window.AssemblyAttribution||{};
    form.querySelectorAll('[data-attribution]').forEach(field=>{field.value=attribution[field.name]||''});
  }
  function openForm(mode='participant',eventId=''){
    formMode=mode==='guest'?'guest':'participant';
    applicationType.value=formMode;
    eventSelector.hidden=formMode!=='guest';
    eventSelect.disabled=formMode!=='guest';
    eventSelect.required=formMode==='guest';
    if(formMode==='guest')setEvent(eventId);
    else{asideTitle.textContent='Ваш запрос — начало разговора.';asideCopy.textContent='Расскажите о себе и о том, что вы хотите найти внутри среды Ассамблеи.'}
    document.getElementById('form-started-at').value=String(Date.now());
    applyAttribution();
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    document.body.classList.add('dialog-open');
    renderStep();
  }
  function closeForm(){if(dialog.open)dialog.close();document.body.classList.remove('dialog-open')}
  function resetForm(){form.reset();currentStep=0;formView.hidden=false;successView.classList.remove('show');renderStep()}

  document.querySelectorAll('[data-open-form]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();openForm(button.dataset.openForm,button.dataset.eventId||'')}));
  document.querySelectorAll('[data-close-form]').forEach(button=>button.addEventListener('click',closeForm));
  eventSelect.addEventListener('change',()=>setEvent(eventSelect.value));
  dialog.addEventListener('cancel',()=>document.body.classList.remove('dialog-open'));
  dialog.addEventListener('close',resetForm);
  dialog.addEventListener('click',event=>{if(event.target===dialog)closeForm()});
  nextButton.addEventListener('click',()=>{if(validateCurrentStep()){currentStep+=1;renderStep()}});
  backButton.addEventListener('click',()=>{currentStep=Math.max(0,currentStep-1);renderStep()});

  async function submitApplication(payload){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),18000);
    try{
      const response=await fetch('/api/applications',{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify(payload),
        signal:controller.signal
      });
      let result={};
      try{result=await response.json()}catch(parseError){result={}}
      if(!response.ok||!result.ok)throw new Error(result.error||'Не удалось отправить заявку. Попробуйте ещё раз или напишите на почту проекта.');
      return result;
    }finally{clearTimeout(timeout)}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!validateCurrentStep())return;
    const data=new FormData(form);
    const payload={};
    for(const [key,value] of data.entries()){if(key in payload)payload[key]=[].concat(payload[key],value);else payload[key]=value}
    const originalSubmit=submitButton.innerHTML;
    submitButton.disabled=true;
    submitButton.innerHTML='Отправляем…';
    form.setAttribute('aria-busy','true');
    try{
      const result=await submitApplication(payload);
      if(result.ok){
      const selected=formMode==='guest'?getEvent(payload.event_id):null;
      document.getElementById('success-title').textContent=formMode==='guest'?'Регистрация отправлена.':'Спасибо. Заявка отправлена.';
      const selectedWhen=selected?[selected.date,selected.time].filter(Boolean).join(' · '):'';
      document.getElementById('success-copy').textContent=selected?`Команда Ассамблеи получила вашу регистрацию на «${selected.title}». ${selectedWhen}. Мы свяжемся с вами по указанным контактам.`:'Команда Ассамблеи получила вашу заявку и свяжется с вами по указанным контактам.';
      formView.hidden=true;
      successView.classList.add('show');
      progress.innerHTML=`<b>${formTitle()}</b> · готово`;
      successView.focus();
      }
    }catch(submitError){
      error.textContent=submitError.name==='AbortError'?'Сервер не ответил вовремя. Попробуйте отправить заявку ещё раз.':submitError.message;
    }finally{
      submitButton.disabled=false;
      submitButton.innerHTML=originalSubmit;
      form.removeAttribute('aria-busy');
    }
  });

  const params=new URLSearchParams(location.search);
  const requestedForm=params.get('form');
  if(requestedForm==='guest'||requestedForm==='participant')requestAnimationFrame(()=>openForm(requestedForm,params.get('event')||''));
})();
