<?php
require_once 'utils.php';

$yesterday = date("Y-m-d", strtotime("-1 day"));
$logs = load_log($yesterday);
$count = count($logs);
$details = "";

foreach ($logs as $entry) {
    $details .= "{$entry['time']} - {$entry['ip']} - {$entry['agent']}\n";
}

$to = "tattapan.c@gmail.com";
$subject = "รายงานผู้เข้าเว็บไซต์ $yesterday";
$message = "จำนวนทั้งหมด: $count คน\n\nรายละเอียด:\n$details";
$headers = "From: stat@yourdomain.com";

mail($to, $subject, $message, $headers);
?>
