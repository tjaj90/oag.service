<?php
require_once 'utils.php';

$start = $_GET['start'] ?? date("Y-m-d", strtotime("-7 days"));
$end = $_GET['end'] ?? date("Y-m-d");

$logs = get_logs_in_range($start, $end);
$chart_data = [];

foreach ($logs as $date => $entries) {
    $chart_data[] = ['date' => $date, 'count' => count($entries)];
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <h2>รายงานสถิติ: <?php echo "$start ถึง $end"; ?></h2>
    <canvas id="myChart"></canvas>
    <script>
        const chartData = <?php echo json_encode($chart_data); ?>;
        const labels = chartData.map(e => e.date);
        const counts = chartData.map(e => e.count);

        const ctx = document.getElementById('myChart').getContext('2d');
        const myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'จำนวนผู้เข้าชม',
                    data: counts,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)'
                }]
            },
        });
    </script>
</body>
</html>
