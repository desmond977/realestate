<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$backendPath = dirname(__DIR__, 2).'/backend';

$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

if (file_exists($backendPath.'/storage/framework/maintenance.php')) {
    require $backendPath.'/storage/framework/maintenance.php';
}

require $backendPath.'/vendor/autoload.php';

$app = require_once $backendPath.'/bootstrap/app.php';

$kernel = $app->make(Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
);

$response->send();

$kernel->terminate($request, $response);
