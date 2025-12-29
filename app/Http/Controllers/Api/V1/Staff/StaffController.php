<?php

namespace App\Http\Controllers\Api\V1\Staff;

use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\StoreStaffRequest;
use App\Http\Requests\Staff\StoreStaffSalaryRequest;
use App\Http\Requests\Staff\UpdateStaffRequest;
use App\Http\Resources\V1\Staff\StaffResource;
use App\Http\Resources\V1\Staff\StaffSalaryResource;
use App\Models\Staff;
use App\Models\StaffSalary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    /**
     * Display a listing of staff.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Staff::with(['user', 'area', 'latestSalary']);

        // Filters
        if ($request->has('area_id') && !empty($request->area_id)) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('position') && !empty($request->position)) {
            $query->where('position', 'like', "%{$request->position}%");
        }

        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('employee_number', 'like', "%{$search}%")
                  ->orWhere('document_number', 'like', "%{$search}%")
                  ->orWhere('position', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $staff = $query->latest('hire_date')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => StaffResource::collection($staff->items()),
            'meta' => [
                'current_page' => $staff->currentPage(),
                'last_page' => $staff->lastPage(),
                'per_page' => $staff->perPage(),
                'total' => $staff->total(),
            ],
        ]);
    }

    /**
     * Store a newly created staff member.
     */
    public function store(StoreStaffRequest $request): JsonResponse
    {
        $data = $request->validated();
        
        // Separar datos de sueldo inicial si se proporciona
        $salaryData = null;
        if (isset($data['initial_salary'])) {
            $salaryData = [
                'amount' => $data['initial_salary'],
                'currency' => $data['salary_currency'] ?? 'BOB',
                'effective_date' => $data['salary_effective_date'] ?? $data['hire_date'],
                'salary_type' => $data['salary_type'] ?? 'monthly',
                'notes' => $data['salary_notes'] ?? null,
                'is_active' => true,
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ];
            unset($data['initial_salary'], $data['salary_currency'], $data['salary_effective_date'], $data['salary_type'], $data['salary_notes']);
        }

        // Crear personal (sin usuario - el usuario se crea después desde la sección de usuarios)
        $staff = Staff::create($data);

        // Crear sueldo inicial si se proporcionó
        if ($salaryData) {
            $salaryData['staff_id'] = $staff->id;
            StaffSalary::create($salaryData);
            $staff->load('latestSalary');
        }

        return response()->json([
            'success' => true,
            'message' => 'Personal creado exitosamente',
            'data' => new StaffResource($staff->load(['user', 'area', 'latestSalary'])),
        ], 201);
    }

    /**
     * Display the specified staff member.
     */
    public function show($id): JsonResponse
    {
        $staff = Staff::with(['user', 'area', 'salaries.approvedBy', 'managedAreas'])->find($id);

        if (!$staff) {
            return response()->json([
                'success' => false,
                'message' => 'Personal no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => new StaffResource($staff),
        ]);
    }

    /**
     * Update the specified staff member.
     */
    public function update(UpdateStaffRequest $request, $id): JsonResponse
    {
        $staff = Staff::find($id);

        if (!$staff) {
            return response()->json([
                'success' => false,
                'message' => 'Personal no encontrado',
            ], 404);
        }

        $data = $request->validated();
        $staff->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Personal actualizado exitosamente',
            'data' => new StaffResource($staff->load(['user', 'area', 'latestSalary'])),
        ]);
    }

    /**
     * Remove the specified staff member.
     */
    public function destroy($id): JsonResponse
    {
        $staff = Staff::find($id);

        if (!$staff) {
            return response()->json([
                'success' => false,
                'message' => 'Personal no encontrado',
            ], 404);
        }

        $staff->delete();

        return response()->json([
            'success' => true,
            'message' => 'Personal eliminado exitosamente',
        ]);
    }

    /**
     * Update staff location (GPS).
     */
    public function updateLocation(Request $request, $id): JsonResponse
    {
        $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        $staff = Staff::find($id);

        if (!$staff) {
            return response()->json([
                'success' => false,
                'message' => 'Personal no encontrado',
            ], 404);
        }

        $staff->update([
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'location_updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Ubicación actualizada exitosamente',
            'data' => [
                'latitude' => (float) $staff->latitude,
                'longitude' => (float) $staff->longitude,
                'location_updated_at' => $staff->location_updated_at?->toDateTimeString(),
            ],
        ]);
    }

    /**
     * Get staff salaries.
     */
    public function salaries($id): JsonResponse
    {
        $staff = Staff::find($id);

        if (!$staff) {
            return response()->json([
                'success' => false,
                'message' => 'Personal no encontrado',
            ], 404);
        }

        $salaries = $staff->salaries()->with('approvedBy')->get();

        return response()->json([
            'success' => true,
            'data' => StaffSalaryResource::collection($salaries),
        ]);
    }

    /**
     * Store a new salary for staff.
     */
    public function storeSalary(StoreStaffSalaryRequest $request, $id): JsonResponse
    {
        $staff = Staff::find($id);

        if (!$staff) {
            return response()->json([
                'success' => false,
                'message' => 'Personal no encontrado',
            ], 404);
        }

        // Desactivar sueldos anteriores que sean activos
        StaffSalary::where('staff_id', $staff->id)
            ->where('is_active', true)
            ->update([
                'is_active' => false,
                'end_date' => $request->effective_date,
            ]);

        $data = $request->validated();
        $data['staff_id'] = $staff->id;
        $data['currency'] = $data['currency'] ?? 'BOB'; // Default to BOB for Bolivia
        $data['is_active'] = true;
        $data['approved_by'] = $request->user()->id;
        $data['approved_at'] = now();

        $salary = StaffSalary::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Sueldo registrado exitosamente',
            'data' => new StaffSalaryResource($salary->load('approvedBy')),
        ], 201);
    }

    /**
     * Generate a unique employee number.
     */
    public function generateEmployeeNumber(Request $request): JsonResponse
    {
        $prefix = 'EMP';
        $areaId = $request->input('area_id');
        
        // Si hay área seleccionada, usar su código como prefijo
        if ($areaId) {
            $area = \App\Models\Area::find($areaId);
            if ($area && $area->code) {
                $prefix = strtoupper($area->code);
            }
        }

        // Buscar el último número de empleado con este prefijo
        // Usar sintaxis compatible con PostgreSQL y MySQL
        $dbDriver = \DB::connection()->getDriverName();
        if ($dbDriver === 'pgsql') {
            $lastEmployee = Staff::where('employee_number', 'like', $prefix . '-%')
                ->orderByRaw('CAST(SUBSTRING(employee_number, ' . (strlen($prefix) + 2) . ') AS INTEGER) DESC')
                ->first();
        } else {
            $lastEmployee = Staff::where('employee_number', 'like', $prefix . '-%')
                ->orderByRaw('CAST(SUBSTRING(employee_number, ' . (strlen($prefix) + 2) . ') AS UNSIGNED) DESC')
                ->first();
        }

        $nextNumber = 1;
        if ($lastEmployee && $lastEmployee->employee_number) {
            // Extraer el número del último employee_number
            $parts = explode('-', $lastEmployee->employee_number);
            if (count($parts) > 1 && is_numeric($parts[1])) {
                $nextNumber = (int) $parts[1] + 1;
            }
        }

        // Generar el nuevo número con padding de ceros (001, 002, etc.)
        $employeeNumber = $prefix . '-' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);

        // Verificar que sea único (por si acaso)
        $counter = 1;
        while (Staff::where('employee_number', $employeeNumber)->exists()) {
            $employeeNumber = $prefix . '-' . str_pad($nextNumber + $counter, 3, '0', STR_PAD_LEFT);
            $counter++;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'employee_number' => $employeeNumber,
            ],
        ]);
    }
}
