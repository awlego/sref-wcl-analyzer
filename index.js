<!DOCTYPE html>
<html lang="en">
<head>
  <title>Bootstrap Example</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.0/jquery.min.js"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>
</head>
<body>

<div class="jumbotron text-center">
  <h1>Blorp</h1>
  <p>Resizable Bleep!</p> 
</div>
  
<div class="container">
  <div class="row">
  
    <div class="col-sm-8">
      <div class="form-inline">
        <input type="reportcode" class="form-control" id="reportcode" placeholder="Report Code...">
        <button onclick="getFights()" class="btn btn-primary">Get</button>
      </div>
      <div id="menu-div"></div>
    </div>
    
    <div class="col-sm-4">
      <div class="well text-justify">
        <h3>Info</h3>
        <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit...</p>
        <p><a href="http://www.wowhead.com/spell=774/rejuvenation">Rejuvenation</a></p>
      </div>
      <div class="well text-justify">
        <h4>More Info I Guess</h4>
        <p>Orgle blorgle bloogle blogle</p>
        <p><a href="http://www.wowhead.com/spell=238122/deep-rooted">Deep Rooted</a></p>
      </div>
    </div>
    
  </div>
</div>

<script>

  function getFights() {
    // make menu
    var menuDiv = document.getElementById('menu-div'); 
    var fightList = document.createElement("select");
	fightList.id = "fight-list";
	menuDiv.appendChild(fightList);
    
    // get fights JSON
    var apiKey = "087783eb78c21061d028831d2344d118"
    var url = "https://www.warcraftlogs.com/v1/report/fights/" + reportCode
      + "?api_key=" + apiKey
    var reportObj = JSON.parse(getJson(url));
    
    // test
    var fightString = reportObj.fights;
    menuDiv.innerHTML = fightString[0];
    
    // populate menu with fight names
    var fights = reportObj.fights;
    for (var i = 0; i < fights.length; i++) {
      var option = document.createElement("option");
      option.value = fights[i].name;
      option.text = fights[i].name;
      fightList.appendChild(option);
	}
  }
  
  function getJson(yourUrl) {
    var Httpreq = new XMLHttpRequest(); // a new request
    Httpreq.open("GET",yourUrl,false);
    Httpreq.send(null);
    return Httpreq.responseText;          
  }

</script>

<script type="text/javascript" src="//wow.zamimg.com/widgets/power.js"></script>
<script>var wowhead_tooltips = { "colorlinks": true, "iconizelinks": true, "renamelinks": true }</script>

</body>

</html>
