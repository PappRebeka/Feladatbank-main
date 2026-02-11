const Docs = {  
  login: "type/login.json",
  tanár: "type/tanari.json",
  admin: "type/admin.json",
};

const Base = "/help/";
var tocState = true

$(document).ready(async function() {
  setThemeIndicators(getCookie("darkMode") == "1");

  setEvents()
  const params = new URLSearchParams(window.location.search)
  const location = params.get('role').toString();
  const file = getDocFile(location)

  const pill = file == Docs['login'] ? 'login' : location
  document.getElementById('rolePill').textContent = pill
  if(window.innerWidth < 992) toggleToc()


  let adat;
  try {
    const res = await fetch(Base + file);
    adat = await res.json();
  } catch (e) {
    $("#regKerdesek").html(`
      <div class="p-4 text-center text-muted">
        <div class="mb-2"><i class="bi bi-exclamation-triangle"></i></div>
        <div>Nem sikerült betölteni a súgót.</div>
      </div>
    `);
    return;
  }
  buildToc(adat)
  document.getElementById('toc').firstChild.classList.add('rounded-top-0')
  buildAccordion(adat)
})

function buildToc(adat){
  const toc = Array.isArray(adat.tartalomJegyzek) ? adat.tartalomJegyzek : [];
  if (toc.length === 0) return "";
  
  const tocDiv = document.getElementById('toc')
  tocDiv.replaceChildren()

  Array.from(toc).forEach(e => {
    let cim = e.cim
    let href = '#section-'+e.href

    let a = document.createElement('a')
    a.classList.add('list-group-item', 'btn-hover', 'cursor-pointer', 'text-dark', 'border-secondary') 
    a.setAttribute('href', href)
    a.addEventListener('click', () => {
      for (const button of document.querySelectorAll('.accordion-button')) {
        button.classList.remove('highlight-accordion-button')
      }
      document.querySelector(`#section-${e.href} button`).classList.add('highlight-accordion-button'); 
    })
    let span = document.createElement('span')
    span.classList.add('text-truncate')
    span.textContent = cim

    a.appendChild(span)
    tocDiv.appendChild(a)
  });
}

function buildAccordion(adat){
  const kerdValaszok = Array.isArray(adat.kerdesekValaszok) ? adat.kerdesekValaszok : [];
  if (kerdValaszok.length == 0) return "";

  const div = document.getElementById('regKerdesek')
  div.replaceChildren()

  Array.from(kerdValaszok).forEach(e => {
    div.appendChild(buildAccordionItem(e))
  })
}

function buildAccordionItem(item){
  const id = item.id;
  const title = item.cim;
  const kepek = Array.isArray(item.kepek) ? item.kepek : [];
  const lepes = Array.isArray(item.lepes) ? item.lepes : [];

  const accordionItem = accordionItemTemplate()
  accordionItem.id = `section-${id}`

  const accBtn = accordionItem.querySelector('.accordion-button')
  accBtn.setAttribute('data-bs-target', '#'+id)
  accBtn.setAttribute('aria-controls', id)
  accBtn.textContent = title

  const lastChild = accordionItem.children[1]
  lastChild.id = id
  
  buildAccordionImages(kepek, lastChild)

  lastChild.appendChild(accordionLepesekTemplate())
  const ol = lastChild.querySelector('ol')

  for (const step of lepes) {
    let li = document.createElement('li')
    li.textContent = step

    ol.appendChild(li)
  }

  return accordionItem

}

function buildAccordionImages(kepek, target){
  const div = document.createElement('div')
  div.classList.add("accordion-body")

  if(kepek.length > 0){
    const carouselId = `${target.id}-lep`;

    let indicators = []
    let inner = []
    for (let i = 0; i < kepek.length; i++) {
      let button = document.createElement('button')
      button.type = 'button'
      button.setAttribute('data-bs-target', '#'+carouselId)
      button.setAttribute('data-bs-slide-to', i)
  
      let item = document.createElement('div')
      item.classList.add('carousel-item')

      let img = document.createElement('img')
      img.classList.add('d-block', 'w-100', 'rounded')
      img.src = kepek[i]
      item.appendChild(img)

      if(i == 0){
        button.classList.add('active')
        item.classList.add('active')
      } 

      indicators.push(button)
      inner.push(item)
    }

    const slide = carouselItemTemplate()
    slide.id = carouselId
    slide.querySelector('.carousel-indicators').replaceChildren(indicators)
    slide.querySelector('.carousel-inner').replaceChildren(inner)
    slide.querySelector('.carousel-control-prev').setAttribute('data-bs-target', '#'+carouselId)
    slide.querySelector('.carousel-control-next').setAttribute('data-bs-target', '#'+carouselId)

  }
  else div.appendChild(accordionNincsKepTemplate())
  target.appendChild(div)
}


function getDocFile(url){
  const file = Docs[url] || Docs['login']
  return file
}

function setEvents(){
  document.getElementById('visszaBtn').addEventListener("click", () => { window.location.href = '/homepage.html'; });
  document.getElementById('themeBtn') .addEventListener("click", () => themeSwitch())
  document.getElementById('search')   .addEventListener("click", () => sugoKeres())
  document.getElementById('tocToggle').addEventListener("click", () => toggleToc())
}

function toggleToc(){
  const toc = document.getElementById('toc');
  const arrow  = document.getElementById('toggleArrow');
  const tocButton = document.getElementById('tocToggle');

  toc.classList.toggle('d-none')

  arrow.classList.toggle('bi-chevron-down')
  arrow.classList.toggle('bi-chevron-up')

  tocButton.classList.toggle('border-bottom-inherit')
}

function sugoKeres(){
  const searchValue = document.getElementById('searchBar').value.toLowerCase()
  const accordionItems = document.querySelectorAll('#regKerdesek .accordion-item')
  
  accordionItems.forEach(item => {
    const button = item.querySelector('.accordion-button')
    const originalText = button.textContent
    
    if(originalText.toLowerCase().includes(searchValue)){
      item.style.display = ''

      highlightSearchedText(searchValue, originalText, button)
    } 
    else {
      item.style.display = 'none'
      button.textContent = originalText
    }
  })
}



