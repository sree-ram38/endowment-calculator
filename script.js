/* =====================================================================
   PART 1: THE DATA
   ===================================================================== */

// Policy terms (years) and the monthly premium for every Rs. 1000 of sum
// assured, taken from the original quote for entry age 24.
var TERMS_IN_YEARS = [11, 16, 21, 26, 31, 34, 36];
var RATES_PER_1000 = [7.6, 5.2, 3.8, 3.0, 2.4, 2.2, 2.0];

// The maturity ages shown in the table.
var MATURITY_AGES = [35, 40, 45, 50, 55, 58, 60];

// The maturity age that is currently selected.
var selectedMaturityAge = 40;


/* =====================================================================
   PART 2: SMALL HELPER FUNCTIONS
   ===================================================================== */

// Find an element on the page by its id.
function byId(id) {
  return document.getElementById(id);
}

// 1234567 becomes "12,34,567".
function formatNumber(number) {
  return Math.round(number).toLocaleString("en-IN");
}

// 1234567 becomes "Rs. 12,34,567".
function formatRupees(number) {
  return "Rs. " + formatNumber(number);
}

// 1500000 becomes "15 lakh". Shown under the sum assured box.
function amountInWords(amount) {
  amount = Math.round(amount);
  if (!amount) {
    return "";
  }

  var crore = Math.floor(amount / 10000000);
  var lakh = Math.floor((amount % 10000000) / 100000);
  var thousand = Math.floor((amount % 100000) / 1000);
  var rest = amount % 1000;
  var words = [];

  if (crore) words.push(crore + " crore");
  if (lakh) words.push(lakh + " lakh");
  if (thousand) words.push(thousand + " thousand");
  if (rest) words.push(rest);

  return words.join(" ");
}

// Read a number from an input box. Returns null if the box is empty.
function readNumber(id) {
  var number = parseFloat(byId(id).value);
  return isNaN(number) ? null : number;
}

// Show an error message, or hide the error box when the message is empty.
function showError(message) {
  var box = byId("err");
  box.textContent = message;
  box.style.display = message ? "block" : "none";
}


/* =====================================================================
   PART 3: THE CALCULATIONS
   ===================================================================== */

// Find the premium rate (per Rs. 1000) for a given entry age and term.
// Entry age 24 uses the quote exactly. Other ages are estimated by drawing
// a straight line between the two nearest terms in the table.
function findPremiumRate(entryAge, termInYears) {
  var isExact = (entryAge === 24);
  var last = TERMS_IN_YEARS.length - 1;

  // Shorter than the shortest term: continue the first line backwards.
  if (termInYears <= TERMS_IN_YEARS[0]) {
    var slope = (RATES_PER_1000[0] - RATES_PER_1000[1]) /
                (TERMS_IN_YEARS[1] - TERMS_IN_YEARS[0]);
    var rate = RATES_PER_1000[0] + (TERMS_IN_YEARS[0] - termInYears) * slope;
    return { rate: rate, isExact: isExact };
  }

  // Longer than the longest term: use the last rate.
  if (termInYears >= TERMS_IN_YEARS[last]) {
    return { rate: RATES_PER_1000[last], isExact: isExact };
  }

  // In between: find the two terms on either side and blend their rates.
  for (var i = 0; i < last; i++) {
    var lowTerm = TERMS_IN_YEARS[i];
    var highTerm = TERMS_IN_YEARS[i + 1];
    if (termInYears >= lowTerm && termInYears <= highTerm) {
      var share = (termInYears - lowTerm) / (highTerm - lowTerm);
      var blended = RATES_PER_1000[i] + share * (RATES_PER_1000[i + 1] - RATES_PER_1000[i]);
      return { rate: blended, isExact: isExact };
    }
  }
}

// The main calculation: works out everything for ONE maturity age.
//   inputs = { entryAge, sumAssured, bonusRate, gstPercent, rebate }
function calculatePolicy(inputs, maturityAge) {
  var term = maturityAge - inputs.entryAge;
  var premiumRate = findPremiumRate(inputs.entryAge, term);

  // Monthly premium before rebate and tax.
  var grossPremium = Math.round(inputs.sumAssured / 1000 * premiumRate.rate);

  // Rebate: the typed value, otherwise Rs. 1 for every Rs. 20,000 of cover.
  var rebate;
  if (inputs.rebate !== null) {
    rebate = inputs.rebate;
  } else {
    rebate = Math.floor(inputs.sumAssured / 20000);
  }

  var tax = Math.round(grossPremium * inputs.gstPercent / 100);

  // What you actually pay each month.
  var netPremium = grossPremium - rebate + tax;

  // Bonus is earned every year, so total bonus = yearly bonus x years.
  var bonusPerYear = inputs.sumAssured / 1000 * inputs.bonusRate;
  var totalBonus = bonusPerYear * term;

  // What you receive at the end, and what you paid in total.
  var maturityAmount = inputs.sumAssured + totalBonus;
  var totalPaid = netPremium * 12 * term;

  return {
    maturityAge: maturityAge,
    term: term,
    isExactRate: premiumRate.isExact,
    grossPremium: grossPremium,
    rebate: rebate,
    tax: tax,
    netPremium: netPremium,
    bonusPerYear: bonusPerYear,
    totalBonus: totalBonus,
    maturityAmount: maturityAmount,
    totalPaid: totalPaid
  };
}

// Approximate yearly return on the premiums paid.
// It guesses a monthly rate, checks whether the premiums would grow to the
// maturity amount, and keeps narrowing the guess (80 times).
function yearlyReturn(monthlyPremium, months, maturityAmount) {
  var low = -0.01;
  var high = 0.05;
  var guess;

  for (var round = 0; round < 80; round++) {
    guess = (low + high) / 2;

    var futureValue;
    if (Math.abs(guess) < 1e-9) {
      futureValue = monthlyPremium * months;
    } else {
      futureValue = monthlyPremium * (Math.pow(1 + guess, months) - 1) / guess * (1 + guess);
    }

    if (futureValue < maturityAmount) {
      low = guess;
    } else {
      high = guess;
    }
  }

  // Turn the monthly rate into a yearly rate.
  return Math.pow(1 + guess, 12) - 1;
}


/* =====================================================================
   PART 4: READING AND CHECKING WHAT THE USER TYPED
   ===================================================================== */

function readInputs() {
  return {
    entryAge: readNumber("age"),
    sumAssured: readNumber("sa"),
    bonusRate: readNumber("br"),
    gstPercent: readNumber("gst"),
    rebate: readNumber("reb")
  };
}

// Returns the first problem found as a message, or "" when all is fine.
function findInputProblem(inputs) {
  if (inputs.entryAge === null || inputs.entryAge < 19 || inputs.entryAge > 55) {
    return "Entry age must be between 19 and 55.";
  }
  if (inputs.sumAssured === null || inputs.sumAssured < 20000 || inputs.sumAssured > 5000000) {
    return "Sum assured must be between Rs. 20,000 and Rs. 50,00,000.";
  }
  if (inputs.bonusRate === null || inputs.bonusRate < 0) {
    return "Enter a valid bonus rate.";
  }
  if (inputs.gstPercent === null || inputs.gstPercent < 0) {
    return "Enter a valid GST percentage (0 or more).";
  }
  if (inputs.rebate !== null && inputs.rebate < 0) {
    return "Rebate cannot be negative.";
  }
  return "";
}


/* =====================================================================
   PART 5: SHOWING THE RESULTS ON THE PAGE
   ===================================================================== */

// The "Maturity age" drop-down.
function fillMaturityDropdown(validAges, entryAge) {
  var options = "";
  validAges.forEach(function (age) {
    var selected = (age === selectedMaturityAge) ? " selected" : "";
    var term = age - entryAge;
    options += '<option value="' + age + '"' + selected + ">" +
               age + " years (" + term + " yrs term)</option>";
  });
  byId("mat").innerHTML = options;
}

// The big premium number, the badge and the mobile bottom bar.
function showHeadline(result) {
  byId("net").textContent = formatRupees(result.netPremium);
  byId("basis").textContent = result.isExactRate ? "Exact quote rate" : "Estimated rate";
  byId("mb1").textContent = formatRupees(result.netPremium);
  byId("mb2").textContent = formatRupees(result.maturityAmount);
}

// The small cards (Policy term, Gross premium, ...).
function showStatCards(result) {
  var yearlyPercent = yearlyReturn(result.netPremium, result.term * 12, result.maturityAmount) * 100;

  // Each card is [label, value, highlighted?].
  var cards = [
    ["Policy term", result.term + " years"],
    ["Gross premium", formatRupees(result.grossPremium)],
    ["Rebate", formatRupees(result.rebate)],
    ["Tax", formatRupees(result.tax)],
    ["Annual bonus", formatRupees(result.bonusPerYear)],
    ["Total bonus", formatRupees(result.totalBonus)],
    ["Maturity amount", formatRupees(result.maturityAmount), true],
    ["Total premium paid", formatRupees(result.totalPaid)],
    ["Approx. return", yearlyPercent.toFixed(1) + "% p.a."]
  ];

  var html = "";
  cards.forEach(function (card) {
    var extraClass = card[2] ? " hl" : "";
    html += '<div class="st' + extraClass + '">' +
              "<span>" + card[0] + "</span>" +
              "<b>" + card[1] + "</b>" +
            "</div>";
  });
  byId("stats").innerHTML = html;
}

// One row of the on-screen "All maturity ages" table.
function screenTableRow(result) {
  var rowClass = (result.maturityAge === selectedMaturityAge) ? ' class="sel"' : "";
  return '<tr data-m="' + result.maturityAge + '"' + rowClass + ">" +
    "<td>" + result.maturityAge + "</td>" +
    "<td>" + result.term + "</td>" +
    "<td>" + formatNumber(result.grossPremium) + "</td>" +
    "<td>" + formatNumber(result.rebate) + "</td>" +
    "<td><b>" + formatNumber(result.netPremium) + "</b></td>" +
    "<td>" + formatNumber(result.netPremium * 12) + "</td>" +
    "<td><b>" + formatNumber(result.totalPaid) + "</b></td>" +
    "<td>" + formatNumber(result.totalBonus) + "</td>" +
    "<td>" + formatNumber(result.maturityAmount) + "</td>" +
    "</tr>";
}

// One row of the table that is used when printing / saving as PDF.
function printTableRow(result) {
  return "<tr>" +
    "<td>" + result.maturityAge + "</td>" +
    "<td>" + result.term + "</td>" +
    "<td>" + formatNumber(result.grossPremium) + "</td>" +
    "<td>" + formatNumber(result.rebate) + "</td>" +
    "<td>" + formatNumber(result.tax) + "</td>" +
    "<td>" + formatNumber(result.netPremium) + "</td>" +
    "<td>" + formatNumber(result.netPremium * 12) + "</td>" +
    "<td>" + formatNumber(result.totalPaid) + "</td>" +
    "<td>" + formatNumber(result.totalBonus) + "</td>" +
    "<td>" + formatNumber(result.maturityAmount) + "</td>" +
    "</tr>";
}

// The details block and the note on the printed page.
function fillPrintDetails(inputs, selectedResult) {
  var dateParts = (byId("date").value || "").split("-");   // ["2024","04","01"]
  var dateText = "";
  if (dateParts.length === 3) {
    dateText = dateParts[2] + " - " + dateParts[1] + " - " + dateParts[0];
  }

  byId("pd").innerHTML =
    "<tr><td>Effective Date</td><td>" + dateText + "</td></tr>" +
    "<tr><td>Policy Holder Age</td><td>" + inputs.entryAge + "</td></tr>" +
    "<tr><td>Sum Assured</td><td>" + inputs.sumAssured + "</td></tr>" +
    "<tr><td>Bonus Rate</td><td>Rs. " + inputs.bonusRate + " per Rs. 1000 sum assured</td></tr>" +
    "<tr><td>Bonus per Annum</td><td>" + Math.round(selectedResult.bonusPerYear) + "</td></tr>" +
    "<tr><td>GST</td><td>" + inputs.gstPercent.toFixed(2) + "</td></tr>";

  if (selectedResult.isExactRate) {
    byId("pn").textContent = "Premium rates as per the quote for entry age 24. This is an estimate, not an official quote.";
  } else {
    byId("pn").textContent = "Premiums are estimated by interpolation for this entry age and may differ from the official PLI table. This is not an official quote.";
  }
}


/* =====================================================================
   PART 6: render() - THE FUNCTION THAT RUNS EVERY TIME ANYTHING CHANGES
   ===================================================================== */

function render() {
  // 1. Read and check the inputs.
  var inputs = readInputs();
  byId("saw").textContent = inputs.sumAssured ? amountInWords(inputs.sumAssured) : "";
  var problem = findInputProblem(inputs);

  // 2. Which maturity ages are possible? Each needs at least a 5 year term.
  inputs.entryAge = Math.floor(inputs.entryAge || 0);
  var validAges = MATURITY_AGES.filter(function (age) {
    return age - inputs.entryAge >= 5;
  });
  if (!problem && validAges.length === 0) {
    problem = "No maturity age is available for this entry age.";
  }

  // 3. If something is wrong: show the message, fade the results, stop.
  showError(problem);
  byId("out").style.opacity = problem ? "0.45" : "1";
  if (problem) {
    byId("mb1").textContent = "–";
    byId("mb2").textContent = "–";
    return;
  }

  // 4. Keep the selected maturity age valid, then fill the drop-down.
  if (validAges.indexOf(selectedMaturityAge) < 0) {
    selectedMaturityAge = validAges[0];
  }
  fillMaturityDropdown(validAges, inputs.entryAge);

  // 5. Calculate the selected maturity age and show the headline results.
  var selectedResult = calculatePolicy(inputs, selectedMaturityAge);
  showHeadline(selectedResult);
  showStatCards(selectedResult);

  // 6. Build one table row for every valid maturity age.
  var screenRows = "";
  var printRows = "";
  validAges.forEach(function (age) {
    var result = calculatePolicy(inputs, age);
    screenRows += screenTableRow(result);
    printRows += printTableRow(result);
  });
  document.querySelector("#cmp tbody").innerHTML = screenRows;
  byId("pt").innerHTML = printRows;

  // 7. Fill in the printable page.
  fillPrintDetails(inputs, selectedResult);
}


/* =====================================================================
   PART 7: REACTING TO THE USER (EVENTS)
   ===================================================================== */

// Typing in any input box recalculates everything.
["age", "sa", "br", "gst", "reb", "date"].forEach(function (id) {
  byId(id).addEventListener("input", render);
});

// Choosing a maturity age from the drop-down.
byId("mat").addEventListener("change", function () {
  selectedMaturityAge = parseInt(this.value, 10);
  render();
});

// Clicking a row in the table selects that maturity age.
document.querySelector("#cmp tbody").addEventListener("click", function (event) {
  var row = event.target.closest("tr");
  if (row) {
    selectedMaturityAge = parseInt(row.getAttribute("data-m"), 10);
    render();
  }
});

// The Reset button puts the starting values back.
byId("reset").addEventListener("click", function () {
  byId("age").value = 24;
  byId("sa").value = 200000;
  byId("br").value = 52;
  byId("gst").value = 0;
  byId("reb").value = "";
  byId("date").value = "2024-04-01";
  selectedMaturityAge = 40;
  render();
});


/* =====================================================================
   PART 8: DESIGN (CLASSIC / MODERN) AND THEME (LIGHT / DARK)
   ===================================================================== */

var htmlTag = document.documentElement;
var systemDarkMode = window.matchMedia("(prefers-color-scheme: dark)");
var memory = {};   // backup if the browser does not allow saving

// Save a choice in the browser (and in memory), or read it back.
function saveChoice(name, value) {
  memory[name] = value;
  try { localStorage.setItem(name, value); } catch (error) { }
}

function loadChoice(name) {
  if (memory[name]) {
    return memory[name];
  }
  try {
    return localStorage.getItem(name);
  } catch (error) {
    return null;
  }
}

// Put the chosen theme and design on the <html> tag. The CSS reads those two
// labels and changes the colours and shapes. Then highlight the active buttons.
function applyLook() {
  var theme = loadChoice("pli-theme") || (systemDarkMode.matches ? "dark" : "light");
  var design = loadChoice("pli-model") || "a";

  htmlTag.setAttribute("data-theme", theme);
  htmlTag.setAttribute("data-model", design);

  document.querySelectorAll(".seg button").forEach(function (button) {
    var isActive;
    if (button.hasAttribute("data-theme")) {
      isActive = (button.getAttribute("data-theme") === theme);
    } else {
      isActive = (button.getAttribute("data-model") === design);
    }
    button.classList.toggle("on", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

// Clicking a Design or Theme button.
document.querySelector(".bar").addEventListener("click", function (event) {
  var button = event.target.closest("button");
  if (!button) {
    return;
  }
  if (button.hasAttribute("data-theme")) {
    saveChoice("pli-theme", button.getAttribute("data-theme"));
  } else {
    saveChoice("pli-model", button.getAttribute("data-model"));
  }
  applyLook();
});

// If the user never chose a theme, follow the phone/computer setting.
if (systemDarkMode.addEventListener) {
  systemDarkMode.addEventListener("change", function () {
    if (!loadChoice("pli-theme")) {
      applyLook();
    }
  });
}


/* =====================================================================
   PART 9: THE MOBILE BOTTOM BAR BUTTON (Results / Inputs)
   ===================================================================== */

// Is the results area still below the middle of the screen?
function resultsAreBelow() {
  return byId("out").getBoundingClientRect().top > window.innerHeight * 0.45;
}

function updateBottomButtonLabel() {
  byId("mgo").textContent = resultsAreBelow() ? "Results ↓" : "Inputs ↑";
}

byId("mgo").addEventListener("click", function () {
  if (resultsAreBelow()) {
    byId("out").scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

window.addEventListener("scroll", updateBottomButtonLabel, { passive: true });
window.addEventListener("resize", updateBottomButtonLabel);


/* =====================================================================
   PART 10: START
   ===================================================================== */

applyLook();
render();
updateBottomButtonLabel();