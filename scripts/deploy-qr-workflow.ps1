# QR Workflow Deployment Script for Windows
# Usage: .\deploy-qr-workflow.ps1

param(
    [ValidateSet('build', 'deploy', 'full')]
    [string]$Mode = 'full',
    [switch]$Local
)

$ProjectDir = "D:\Adruva_Resto\adruva-charm-engine"
$ScriptDir = $PSScriptRoot

# Colors for output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error-Custom { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning-Custom { Write-Host $args -ForegroundColor Yellow }

Write-Info "=========================================="
Write-Info "QR Workflow Deployment Script"
Write-Info "=========================================="
Write-Info ""

# Check if in correct directory
if (-not (Test-Path "$ProjectDir\package.json")) {
    Write-Error-Custom "Error: package.json not found in $ProjectDir"
    Write-Info "Please run this script from the project root directory"
    exit 1
}

Write-Info "Project Directory: $ProjectDir"
Write-Info "Mode: $Mode"
Write-Info ""

# Function: Check Prerequisites
function Check-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    $checks = @(
        @{ Name = "Node.js"; Command = "node --version" },
        @{ Name = "npm"; Command = "npm --version" },
        @{ Name = "Vercel CLI"; Command = "vercel --version" }
    )
    
    foreach ($check in $checks) {
        try {
            $result = & cmd /c $check.Command 2>&1
            Write-Success "  ✓ $($check.Name): $result"
        }
        catch {
            Write-Error-Custom "  ✗ $($check.Name): NOT FOUND"
            return $false
        }
    }
    
    return $true
}

# Function: Check Environment Variables
function Check-Environment {
    Write-Info "Checking environment variables..."
    
    $ProjectDir | Set-Location
    
    if (-not (Test-Path ".env")) {
        Write-Error-Custom "  ✗ .env file not found"
        Write-Info "  Please copy .env.example to .env and configure"
        return $false
    }
    
    # Read .env file
    $envContent = Get-Content .env -Raw
    
    $requiredVars = @(
        "VITE_SUPABASE_URL",
        "VITE_SUPABASE_PUBLISHABLE_KEY"
    )
    
    foreach ($var in $requiredVars) {
        if ($envContent -match "$var=") {
            Write-Success "  ✓ $var configured"
        }
        else {
            Write-Error-Custom "  ✗ $var NOT configured"
            return $false
        }
    }
    
    return $true
}

# Function: Build Application
function Build-App {
    Write-Info ""
    Write-Info "Building application..."
    
    $ProjectDir | Set-Location
    
    Write-Info "  Running: npm run build"
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  ✓ Build successful"
        return $true
    }
    else {
        Write-Error-Custom "  ✗ Build failed with exit code $LASTEXITCODE"
        return $false
    }
}

# Function: Deploy to Vercel
function Deploy-Vercel {
    param(
        [string]$Environment = "production"
    )
    
    Write-Info ""
    Write-Info "Deploying to Vercel ($Environment)..."
    
    $ProjectDir | Set-Location
    
    if ($Environment -eq "production") {
        Write-Info "  Running: vercel deploy --prod"
        vercel deploy --prod
    }
    else {
        Write-Info "  Running: vercel deploy"
        vercel deploy
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "  ✓ Vercel deployment successful"
        return $true
    }
    else {
        Write-Error-Custom "  ✗ Vercel deployment failed"
        return $false
    }
}

# Function: Show Deployment Status
function Show-Deployment-Status {
    Write-Info ""
    Write-Info "=========================================="
    Write-Info "Deployment Status"
    Write-Info "=========================================="
    Write-Info ""
    
    $ProjectDir | Set-Location
    
    Write-Info "Checking Vercel deployment status..."
    vercel status
    
    Write-Info ""
    Write-Info "Application URL: https://adruva-charm-engine.vercel.app"
    Write-Info ""
}

# Function: Show Manual Deployment Steps
function Show-Manual-Steps {
    Write-Info ""
    Write-Info "=========================================="
    Write-Info "Manual Deployment Steps Required"
    Write-Info "=========================================="
    Write-Info ""
    
    Write-Info "1. DATABASE MIGRATIONS"
    Write-Info "   - Go to: https://supabase.com/dashboard"
    Write-Info "   - Select project: vppaelgxovnqkqdegajb"
    Write-Info "   - Go to SQL Editor"
    Write-Info "   - Run migrations from:"
    Write-Info "     supabase/migrations/20260404110000_create_qr_workflow_tables.sql"
    Write-Info "     supabase/migrations/20260404110500_create_qr_validation_functions.sql"
    Write-Info ""
    
    Write-Info "2. EDGE FUNCTIONS"
    Write-Info "   - Upload functions from supabase/functions/ to Supabase dashboard"
    Write-Info "   - Functions needed:"
    Write-Info "     - qr-validate"
    Write-Info "     - payment-links-create"
    Write-Info "     - payment-webhook"
    Write-Info ""
    
    Write-Info "3. WEBHOOK CONFIGURATION"
    Write-Info "   - Razorpay Dashboard → Settings → Webhooks"
    Write-Info "   - Add webhook URL: https://your-domain/api/webhooks/payment-callback"
    Write-Info "   - Events: payment.authorized, payment.failed, payment.captured"
    Write-Info ""
    
    Write-Info "4. ENVIRONMENT VARIABLES (Vercel)"
    Write-Info "   - Go to: https://vercel.com/dashboard"
    Write-Info "   - Select project: adruva-charm-engine"
    Write-Info "   - Settings → Environment Variables"
    Write-Info "   - Add:"
    Write-Info "     RAZORPAY_KEY_ID"
    Write-Info "     RAZORPAY_KEY_SECRET"
    Write-Info "     RAZORPAY_WEBHOOK_SECRET"
    Write-Info ""
}

# Main Execution
try {
    # Check prerequisites
    if (-not (Check-Prerequisites)) {
        Write-Error-Custom "Prerequisites check failed"
        exit 1
    }
    Write-Success "✓ Prerequisites verified"
    
    # Check environment
    if (-not (Check-Environment)) {
        Write-Error-Custom "Environment check failed"
        exit 1
    }
    Write-Success "✓ Environment configured"
    
    # Execute based on mode
    switch ($Mode) {
        "build" {
            if (-not (Build-App)) { exit 1 }
            Write-Success "✓ Build completed"
        }
        
        "deploy" {
            if (-not (Deploy-Vercel)) { exit 1 }
            Show-Deployment-Status
            Write-Success "✓ Deployment completed"
        }
        
        "full" {
            if (-not (Build-App)) { exit 1 }
            if (-not (Deploy-Vercel)) { exit 1 }
            Show-Deployment-Status
            Show-Manual-Steps
            Write-Success "✓ Full deployment completed"
        }
    }
    
    Write-Info ""
    Write-Success "=========================================="
    Write-Success "✓ Deployment Process Complete"
    Write-Success "=========================================="
    Write-Info ""
    Write-Warning-Custom "⚠ IMPORTANT: Manual steps remaining (see above)"
    Write-Info ""
}
catch {
    Write-Error-Custom "Deployment failed with error:"
    Write-Error-Custom $_
    exit 1
}
