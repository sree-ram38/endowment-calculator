var T=[11,16,21,26,31,34,36],R=[7.6,5.2,3.8,3,2.4,2.2,2],MA=[35,40,45,50,55,58,60];
var selM=40;
function $(i){return document.getElementById(i)}
function fmt(n){return Math.round(n).toLocaleString("en-IN")}
function rs(n){return "Rs. "+fmt(n)}
function words(n){
  n=Math.round(n);if(!n)return "";
  var c=Math.floor(n/1e7),l=Math.floor(n%1e7/1e5),t=Math.floor(n%1e5/1e3),o=[];
  if(c)o.push(c+" crore");if(l)o.push(l+" lakh");if(t)o.push(t+" thousand");
  var r=n%1e3;if(r)o.push(r);return o.join(" ");
}
function rateFor(age,d){
  var x=age===24;
  if(d<=T[0])return{r:R[0]+(T[0]-d)*(R[0]-R[1])/(T[1]-T[0]),x:x};
  if(d>=T[6])return{r:R[6],x:x};
  for(var i=0;i<6;i++){
    if(d>=T[i]&&d<=T[i+1]){return{r:R[i]+(d-T[i])*(R[i+1]-R[i])/(T[i+1]-T[i]),x:x}}
  }
}
function irr(P,n,M){
  var lo=-0.01,hi=0.05,i,mid,fv;
  for(i=0;i<80;i++){
    mid=(lo+hi)/2;
    fv=Math.abs(mid)<1e-9?P*n:P*(Math.pow(1+mid,n)-1)/mid*(1+mid);
    if(fv<M)lo=mid;else hi=mid;
  }
  return Math.pow(1+mid,12)-1;
}
function val(id){var v=parseFloat($(id).value);return isNaN(v)?null:v}
function calc(o,m){
  var d=m-o.age,rt=rateFor(o.age,d);
  var gross=Math.round(o.sa/1000*rt.r);
  var reb=o.reb!==null?o.reb:Math.floor(o.sa/20000);
  var tax=Math.round(gross*o.gst/100);
  var net=gross-reb+tax,bpa=o.sa/1000*o.br,bonus=bpa*d,mat=o.sa+bonus,paid=net*12*d;
  return{m:m,d:d,x:rt.x,gross:gross,reb:reb,tax:tax,net:net,bpa:bpa,bonus:bonus,mat:mat,paid:paid};
}
function showErr(msg){var e=$("err");e.textContent=msg;e.style.display=msg?"block":"none"}
function render(){
  var age=val("age"),sa=val("sa"),br=val("br"),gst=val("gst"),reb=val("reb"),msg="";
  $("saw").textContent=sa?words(sa):"";
  if(age===null||age<19||age>55)msg="Entry age must be between 19 and 55.";
  else if(sa===null||sa<20000||sa>5000000)msg="Sum assured must be between Rs. 20,000 and Rs. 50,00,000.";
  else if(br===null||br<0)msg="Enter a valid bonus rate.";
  else if(gst===null||gst<0)msg="Enter a valid GST percentage (0 or more).";
  else if(reb!==null&&reb<0)msg="Rebate cannot be negative.";
  age=Math.floor(age||0);
  var valid=MA.filter(function(m){return m-age>=5});
  if(!msg&&!valid.length)msg="No maturity age is available for this entry age.";
  showErr(msg);
  var o=$("out");o.style.opacity=msg?".45":"1";
  if(msg){$("mb1").textContent="–";$("mb2").textContent="–";return}
  if(valid.indexOf(selM)<0)selM=valid[0];
  $("mat").innerHTML=valid.map(function(m){return '<option value="'+m+'"'+(m===selM?" selected":"")+'>'+m+" years ("+(m-age)+" yrs term)</option>"}).join("");
  var op={age:age,sa:sa,br:br,gst:gst,reb:reb};
  var c=calc(op,selM);
  $("net").textContent=rs(c.net);
  $("basis").textContent=c.x?"Exact quote rate":"Estimated rate";
  $("mb1").textContent=rs(c.net);$("mb2").textContent=rs(c.mat);
  var ret=irr(c.net,c.d*12,c.mat);
  var S=[["Policy term",c.d+" years"],["Gross premium",rs(c.gross)],["Rebate",rs(c.reb)],["Tax",rs(c.tax)],["Annual bonus",rs(c.bpa)],["Total bonus",rs(c.bonus)],["Maturity amount",rs(c.mat),1],["Total premium paid",rs(c.paid)],["Approx. return",(ret*100).toFixed(1)+"% p.a."]];
  $("stats").innerHTML=S.map(function(s){return '<div class="st'+(s[2]?" hl":"")+'"><span>'+s[0]+"</span><b>"+s[1]+"</b></div>"}).join("");
  var h="",t="";
  valid.forEach(function(m){
    var r=calc(op,m);
    h+='<tr data-m="'+m+'"'+(m===selM?' class="sel"':"")+'><td data-l="Maturity age">'+m+'</td><td data-l="Years">'+r.d+'</td><td data-l="Premium">'+fmt(r.gross)+'</td><td data-l="Rebate">'+fmt(r.reb)+'</td><td data-l="Net / month"><b>'+fmt(r.net)+'</b></td><td data-l="Yearly premium">'+fmt(r.net*12)+'</td><td data-l="Total to pay"><b>'+fmt(r.paid)+'</b></td><td data-l="Total bonus">'+fmt(r.bonus)+'</td><td data-l="Maturity">'+fmt(r.mat)+"</td></tr>";
    t+="<tr><td>"+m+"</td><td>"+r.d+"</td><td>"+fmt(r.gross)+"</td><td>"+fmt(r.reb)+"</td><td>"+fmt(r.tax)+"</td><td>"+fmt(r.net)+"</td><td>"+fmt(r.net*12)+"</td><td>"+fmt(r.paid)+"</td><td>"+fmt(r.bonus)+"</td><td>"+fmt(r.mat)+"</td></tr>";
  });
  document.querySelector("#cmp tbody").innerHTML=h;
  $("pt").innerHTML=t;
  var dv=($("date").value||"").split("-");
  $("pd").innerHTML="<tr><td>Effective Date</td><td>"+(dv.length===3?dv[2]+" - "+dv[1]+" - "+dv[0]:"")+"</td></tr><tr><td>Policy Holder Age</td><td>"+age+"</td></tr><tr><td>Sum Assured</td><td>"+sa+"</td></tr><tr><td>Bonus Rate</td><td>Rs. "+br+" per Rs. 1000 sum assured</td></tr><tr><td>Bonus per Annum</td><td>"+Math.round(c.bpa)+"</td></tr><tr><td>GST</td><td>"+gst.toFixed(2)+"</td></tr>";
  $("pn").textContent=c.x?"Premium rates as per the quote for entry age 24. This is an estimate, not an official quote.":"Premiums are estimated by interpolation for this entry age and may differ from the official PLI table. This is not an official quote.";
}
["age","sa","br","gst","reb","date"].forEach(function(i){$(i).addEventListener("input",render)});
$("mat").addEventListener("change",function(){selM=parseInt(this.value,10);render()});
document.querySelector("#cmp tbody").addEventListener("click",function(e){
  var tr=e.target.closest("tr");if(tr){selM=parseInt(tr.getAttribute("data-m"),10);render()}
});
$("reset").addEventListener("click",function(){
  $("age").value=24;$("sa").value=200000;$("br").value=52;$("gst").value=0;$("reb").value="";$("date").value="2024-04-01";selM=40;render();
});
var root=document.documentElement,mq=window.matchMedia("(prefers-color-scheme: dark)"),mem={};
function store(k,v){
  if(v!==undefined){mem[k]=v;try{localStorage.setItem(k,v)}catch(e){}return}
  if(mem[k])return mem[k];
  try{return localStorage.getItem(k)}catch(e){return null}
}
function applyUI(){
  var th=store("pli-theme")||(mq.matches?"dark":"light"),md=store("pli-model")||"a";
  root.setAttribute("data-theme",th);root.setAttribute("data-model",md);
  document.querySelectorAll(".seg button").forEach(function(b){
    var on=b.hasAttribute("data-theme")?b.getAttribute("data-theme")===th:b.getAttribute("data-model")===md;
    b.classList.toggle("on",on);b.setAttribute("aria-pressed",on?"true":"false");
  });
}
document.querySelector(".bar").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;
  if(b.hasAttribute("data-theme"))store("pli-theme",b.getAttribute("data-theme"));
  else store("pli-model",b.getAttribute("data-model"));
  applyUI();
});
if(mq.addEventListener)mq.addEventListener("change",function(){if(!store("pli-theme"))applyUI()});
function outBelow(){return $("out").getBoundingClientRect().top>window.innerHeight*0.45}
function lab(){$("mgo").textContent=outBelow()?"Results ↓":"Inputs ↑"}
$("mgo").addEventListener("click",function(){
  if(outBelow())$("out").scrollIntoView({behavior:"smooth",block:"start"});
  else window.scrollTo({top:0,behavior:"smooth"});
});
window.addEventListener("scroll",lab,{passive:true});
window.addEventListener("resize",lab);
applyUI();
render();
lab();
