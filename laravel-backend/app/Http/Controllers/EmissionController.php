<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Emission;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class EmissionController extends Controller
{
    /**
     * Display a listing of emissions.
     */
    public function index(Request $request)
    {
        $userId = $request->query('user_id') ?? $request->query('sessionId');
        
        $query = Emission::query();
        if ($userId) {
            $query->where('user_id', $userId);
        }
        
        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    /**
     * Store a newly created emission record.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'nullable|string',
            'sessionId' => 'nullable|string',
            'transport' => 'required|numeric|min:0',
            'electricity' => 'required|numeric|min:0',
            'food' => 'required|numeric|min:0',
        ]);

        $userId = $request->input('user_id') ?? $request->input('sessionId') ?? 'anonymous';
        $transport = (float) $request->input('transport');
        $electricity = (float) $request->input('electricity');
        $food = (float) $request->input('food');

        // Carbon calculation logic:
        // total = (transport * 0.21) + (electricity * 0.5) + (food * 2)
        $total = ($transport * 0.21) + ($electricity * 0.5) + ($food * 2.0);

        $emission = Emission::create([
            'user_id' => $userId,
            'transport' => $transport,
            'electricity' => $electricity,
            'food' => $food,
            'total' => $total,
        ]);

        return response()->json($emission, 201);
    }

    /**
     * Remove the specified emission record.
     */
    public function destroy($id)
    {
        $emission = Emission::find($id);

        if (!$emission) {
            return response()->json(['message' => 'Emission record not found'], 404);
        }

        $emission->delete();

        return response()->json(null, 204);
    }

    /**
     * Mock GET /api/activities to list activities for a session (maps from emissions DB).
     */
    public function index_activities(Request $request)
    {
        $sessionId = $request->query('sessionId');
        if (!$sessionId) {
            return response()->json([]);
        }

        $emissions = Emission::where('user_id', $sessionId)
            ->orderBy('created_at', 'desc')
            ->get();

        $activities = [];
        foreach ($emissions as $em) {
            // We expand each database emission row into separate visual logs for the UI
            if ($em->transport > 0) {
                $activities[] = [
                    'id' => $em->id * 1000 + 1,
                    'sessionId' => $em->user_id,
                    'category' => 'transport',
                    'activityType' => 'driving',
                    'activityLabel' => 'Driving distance',
                    'value' => $em->transport,
                    'unit' => 'km',
                    'co2Amount' => $em->transport * 0.21,
                    'loggedAt' => $em->created_at->toIso8601String(),
                ];
            }
            if ($em->electricity > 0) {
                $activities[] = [
                    'id' => $em->id * 1000 + 2,
                    'sessionId' => $em->user_id,
                    'category' => 'energy',
                    'activityType' => 'electricity_usage',
                    'activityLabel' => 'Electricity usage',
                    'value' => $em->electricity,
                    'unit' => 'kWh',
                    'co2Amount' => $em->electricity * 0.5,
                    'loggedAt' => $em->created_at->toIso8601String(),
                ];
            }
            if ($em->food > 0) {
                $activities[] = [
                    'id' => $em->id * 1000 + 3,
                    'sessionId' => $em->user_id,
                    'category' => 'food',
                    'activityType' => 'meals',
                    'activityLabel' => 'Meat/processed food meals',
                    'value' => $em->food,
                    'unit' => 'meals',
                    'co2Amount' => $em->food * 2.0,
                    'loggedAt' => $em->created_at->toIso8601String(),
                ];
            }
        }

        return response()->json($activities);
    }

    /**
     * Mock GET /api/activities/summary to provide dashboard aggregates from emissions DB.
     */
    public function index_summary(Request $request)
    {
        $sessionId = $request->query('sessionId');
        if (!$sessionId) {
            return response()->json([
                'totalCo2' => 0,
                'byCategory' => [],
                'dailyAverage' => 0,
                'globalAverage' => 16.0,
                'treeEquivalent' => 0,
                'flightHoursEquivalent' => 0,
                'weeklyData' => []
            ]);
        }

        $emissions = Emission::where('user_id', $sessionId)->get();

        $totalTransportCo2 = 0;
        $totalElectricityCo2 = 0;
        $totalFoodCo2 = 0;
        $totalCo2 = 0;

        foreach ($emissions as $em) {
            $totalTransportCo2 += $em->transport * 0.21;
            $totalElectricityCo2 += $em->electricity * 0.5;
            $totalFoodCo2 += $em->food * 2.0;
            $totalCo2 += $em->total;
        }

        $byCategory = [
            [
                'category' => 'transport',
                'co2Amount' => $totalTransportCo2,
                'percentage' => $totalCo2 > 0 ? ($totalTransportCo2 / $totalCo2) * 100 : 0
            ],
            [
                'category' => 'energy',
                'co2Amount' => $totalElectricityCo2,
                'percentage' => $totalCo2 > 0 ? ($totalElectricityCo2 / $totalCo2) * 100 : 0
            ],
            [
                'category' => 'food',
                'co2Amount' => $totalFoodCo2,
                'percentage' => $totalCo2 > 0 ? ($totalFoodCo2 / $totalCo2) * 100 : 0
            ]
        ];

        // Calculation of daily average (assumes past 7 days)
        $dailyAverage = count($emissions) > 0 ? $totalCo2 / 7.0 : 0;
        $treeEquivalent = $totalCo2 / 20.0; // 1 tree absorbs ~20kg of CO2 per year
        $flightHoursEquivalent = $totalCo2 / 90.0; // 1 hour of flight ~90kg of CO2

        // Weekly chart data (past 7 days)
        $weeklyData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i)->format('Y-m-d');
            
            // Sum emissions on this day
            $daySum = Emission::where('user_id', $sessionId)
                ->whereDate('created_at', $date)
                ->sum('total');

            $weeklyData[] = [
                'date' => $date,
                'co2Amount' => (float) $daySum
            ];
        }

        return response()->json([
            'totalCo2' => $totalCo2,
            'byCategory' => $byCategory,
            'dailyAverage' => $dailyAverage,
            'globalAverage' => 16.0,
            'treeEquivalent' => $treeEquivalent,
            'flightHoursEquivalent' => $flightHoursEquivalent,
            'weeklyData' => $weeklyData
        ]);
    }

    /**
     * Mock GET /api/challenges
     */
    public function list_challenges()
    {
        return response()->json([
            [
                'id' => 1,
                'title' => 'Car-Free Commute',
                'description' => 'Walk, bike, or use transit for all commutes today.',
                'category' => 'transport',
                'co2Reduction' => 4.2,
                'icon' => 'bike',
                'difficulty' => 'easy'
            ],
            [
                'id' => 2,
                'title' => 'Unplug and Unwind',
                'description' => 'Unplug all unused chargers and electronics for 24 hours.',
                'category' => 'energy',
                'co2Reduction' => 1.8,
                'icon' => 'zap',
                'difficulty' => 'easy'
            ],
            [
                'id' => 3,
                'title' => 'Meatless Day',
                'description' => 'Eat only plant-based meals today.',
                'category' => 'food',
                'co2Reduction' => 5.5,
                'icon' => 'leaf',
                'difficulty' => 'medium'
            ],
            [
                'id' => 4,
                'title' => 'Zero Waste Shopping',
                'description' => 'Avoid purchasing any single-use plastic wrapped items today.',
                'category' => 'shopping',
                'co2Reduction' => 2.5,
                'icon' => 'shopping-bag',
                'difficulty' => 'medium'
            ]
        ]);
    }

    /**
     * Mock GET /api/challenges/completions
     */
    public function list_challenge_completions(Request $request)
    {
        return response()->json([]);
    }

    /**
     * Mock POST /api/challenges/{id}/complete
     */
    public function complete_challenge(Request $request, $id)
    {
        return response()->json([
            'id' => rand(100, 999),
            'sessionId' => $request->input('sessionId') ?? 'anonymous',
            'challengeId' => (int) $id,
            'completedAt' => Carbon::now()->toIso8601String()
        ], 201);
    }

    /**
     * Mock GET /api/leaderboard
     */
    public function get_leaderboard(Request $request)
    {
        $sessionId = $request->query('sessionId') ?? 'anonymous';
        return response()->json([
            [
                'rank' => 1,
                'displayName' => 'GreenerFuture',
                'co2Reduced' => 42.5,
                'challengesCompleted' => 8,
                'totalCo2Logged' => 120.4,
                'topCategory' => 'transport',
                'isCurrentUser' => false
            ],
            [
                'rank' => 2,
                'displayName' => 'EcoWarrior',
                'co2Reduced' => 38.0,
                'challengesCompleted' => 6,
                'totalCo2Logged' => 145.2,
                'topCategory' => 'food',
                'isCurrentUser' => false
            ],
            [
                'rank' => 3,
                'displayName' => 'CurrentUser (You)',
                'co2Reduced' => 21.0,
                'challengesCompleted' => 3,
                'totalCo2Logged' => 80.0,
                'topCategory' => 'energy',
                'isCurrentUser' => true
            ],
            [
                'rank' => 4,
                'displayName' => 'EarthFriend',
                'co2Reduced' => 15.2,
                'challengesCompleted' => 2,
                'totalCo2Logged' => 95.8,
                'topCategory' => 'shopping',
                'isCurrentUser' => false
            ]
        ]);
    }

    /**
     * Mock POST /api/coach/advice
     */
    public function get_coach_advice(Request $request)
    {
        return response()->json([
            'message' => 'Great progress on tracking your emissions! Let us optimize your footprint.',
            'focusArea' => 'transport',
            'weeklyGoal' => 'Reduce transport emissions by 15% this week.',
            'tips' => [
                [
                    'category' => 'transport',
                    'tip' => 'Try combining errands into a single trip or carpool when possible.',
                    'impact' => 'Medium',
                    'effort' => 'low'
                ],
                [
                    'category' => 'energy',
                    'tip' => 'Adjust your thermostat by 1-2 degrees. It saves up to 10% on energy costs.',
                    'impact' => 'High',
                    'effort' => 'medium'
                ]
            ]
        ]);
    }
}
