<?php

function get_log_path($date) {
    $parts = explode('-', $date);
    $dir = __DIR__ . "/logs/{$parts[0]}/{$parts[1]}";
    if (!file_exists($dir)) mkdir($dir, 0777, true);
    return "$dir/{$parts[2]}.json";
}

function load_log($date) {
    $path = get_log_path($date);
    return file_exists($path) ? json_decode(file_get_contents($path), true) : [];
}

function save_log($date, $data) {
    $path = get_log_path($date);
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));
}

function is_recent_duplicate($data, $ip, $minutes = 30) {
    $now = time();
    foreach (array_reverse($data) as $entry) {
        if ($entry['ip'] === $ip) {
            $entryTime = strtotime($entry['date'] . ' ' . $entry['time']);
            if (($now - $entryTime) <= ($minutes * 60)) {
                return true;
            }
        }
    }
    return false;
}

function get_logs_in_range($start, $end) {
    $current = strtotime($start);
    $end = strtotime($end);
    $result = [];

    while ($current <= $end) {
        $date = date("Y-m-d", $current);
        $logs = load_log($date);
        if (!empty($logs)) {
            $result[$date] = $logs;
        }
        $current = strtotime("+1 day", $current);
    }

    return $result;
}
?>
