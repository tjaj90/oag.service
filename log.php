<?php
require_once 'utils.php';

$ip = $_SERVER['REMOTE_ADDR'];
$agent = $_SERVER['HTTP_USER_AGENT'];
$timestamp = time();
$date = date("Y-m-d", $timestamp);
$time = date("H:i:s", $timestamp);

$data = load_log($date);
if (!is_recent_duplicate($data, $ip, 30)) {
    $data[] = [
        'ip' => $ip,
        'agent' => $agent,
        'date' => $date,
        'time' => $time
    ];
    save_log($date, $data);
    echo json_encode(["status" => "logged"]);
} else {
    echo json_encode(["status" => "duplicate"]);
}
?>
