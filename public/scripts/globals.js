//   All shared frontend state lives here. Other scripts are expected to read/write these values

var CurrentUserData = {}; 
var hibaIndex = 0 // current error index for error reporting
const max_fajl_meret = 30 * 1024 * 1024; // 30 MB
const htmlElement = document.documentElement; 

const AvailablePages = {
  "Feladataim":          { hideElements: false, pageId: 'fel_page',   requredJogosultsag: ['Tanár']},
  "Archívum":            { hideElements: false, pageId: 'arch_page',  requredJogosultsag: ['Tanár']},
  "Velem megosztott":    { hideElements: false, pageId: 'velem_page', requredJogosultsag: ['Tanár']},
  "Általam megosztott":  { hideElements: false, pageId: 'meg_page',   requredJogosultsag: ['Tanár']}, // + maybe csillagozva
  "Felhasználók":        { hideElements: false, pageId: 'user_page',  requredJogosultsag: ['Admin']},
  "Hibajelentés":        { hideElements: true,  pageId: 'hiba_page',  requredJogosultsag: ['Tanár', 'Főadmin']},
  "Adatbázis műveletek": { hideElements: true,  pageId: 'db_page',    requredJogosultsag: ['Főadmin']}, 
  "Statisztikák":        { hideElements: true,  pageId: 'stat_page',  requredJogosultsag: ['Tanár']} 
};

var ActiveLocation = ''; // current active page, default set onload 
var feladatAdatai = [] // active task data

// user's course data
var kurzusok_nevek; 
var kurzusok_idk;
var pId = 1; // ??

var slim_felAdd = false // whether slim task addition ui is active
var kicsiMeretu = false // whether window is too small for view
var darkMode = false;   // whether dark theme is on

var deleteIds = []; // array of tasks marked for deletion

// filtes and sorting 
var ActiveFilters = {
    evfolyam: "",
    tantargy: "",
    nehezseg: "",
    tanar: "",
    kereso: "",
    order: {field: "", desc: 0} // 0 asc, 1 desc
}

var TempFilters = structuredClone(ActiveFilters); // temporary storage for filters until confirmation
 
// pagination
var limit; 
var offset = 0;
var activePageNumber = 1; 
var resultsCount; 
var maxPageNumber; 


var ujChart; // chart instance
var generatedChartNumber = 0;

var tanuloIdk // students allegible for sharing task
var tanuloObject = {Idk:[], Nevek:[]} 
var StatUserId; // user ID for statistics view

var flatPicker; 
var StatPageCounter = 1;
var intezmenyek = [] // array of institutions
var userId_ToChangeInstitute; // user flagged for moving institutions

var intezmenyId 
var kurzusId   

var editor = null; //sql input

