<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EmissionController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Emissions CRUD routes
Route::get('/emissions', [EmissionController::class, 'index']);
Route::post('/emissions', [EmissionController::class, 'store']);
Route::delete('/emissions/{id}', [EmissionController::class, 'destroy']);

// Compatibility mock endpoints for standard pages
Route::get('/activities', [EmissionController::class, 'index_activities']);
Route::get('/activities/summary', [EmissionController::class, 'index_summary']);
Route::get('/challenges', [EmissionController::class, 'list_challenges']);
Route::get('/challenges/completions', [EmissionController::class, 'list_challenge_completions']);
Route::post('/challenges/{id}/complete', [EmissionController::class, 'complete_challenge']);
Route::get('/leaderboard', [EmissionController::class, 'get_leaderboard']);
Route::post('/coach/advice', [EmissionController::class, 'get_coach_advice']);

Route::get('/healthz', function () {
    return response()->json(['status' => 'healthy']);
});
