fetch("log.php")
  .then(res => res.json())
  .then(data => console.log("Tracker:", data.status));
