using System.Security.Claims;
using AspNet.Security.OAuth.Discord;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.HttpOverrides;
using Quartermaster.Core.Data;

var builder = WebApplication.CreateBuilder(args);

// Add service support
builder.Host.UseWindowsService(options => options.ServiceName = "QuartermasterWeb");
builder.Host.UseSystemd();

// Robust configuration loading
// ... (previous logic preserved)
string configName = "appsettings.json";
string configPath = "";

if (File.Exists(configName)) configPath = Path.GetFullPath(configName);
else if (File.Exists(Path.Combine(AppContext.BaseDirectory, configName))) configPath = Path.Combine(AppContext.BaseDirectory, configName);
else if (File.Exists(Path.Combine("..", configName))) configPath = Path.GetFullPath(Path.Combine("..", configName));

if (string.IsNullOrEmpty(configPath))
{
    throw new FileNotFoundException("appsettings.json not found in current, base, or parent directory!");
}

builder.Configuration.AddJsonFile(configPath, optional: false, reloadOnChange: true);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddHttpClient();
builder.Services.AddScoped<Quartermaster.Web.Services.DiscordApiService>();

// Data Services
var dbPath = builder.Configuration.GetValue<string>("Bot:DatabasePath") ?? "bot.db";
var dbService = new SqliteDatabaseService(dbPath);
await dbService.InitializeDatabaseAsync();
builder.Services.AddSingleton<IDatabaseService>(dbService);

// 1. Forwarded Headers (Essential for Reverse Proxies like Nginx/Caddy)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// 2. Cookie Policy (Fixes 'Correlation failed')
builder.Services.Configure<CookiePolicyOptions>(options =>
{
    options.CheckConsentNeeded = context => false;
    options.MinimumSameSitePolicy = SameSiteMode.Lax;
});

// Authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = DiscordAuthenticationDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.LoginPath = "/login";
    options.LogoutPath = "/logout";
    options.Cookie.SameSite = SameSiteMode.Lax;
})
.AddDiscord(options =>
{
    options.ClientId = builder.Configuration["Discord:ClientId"] ?? "";
    options.ClientSecret = builder.Configuration["Discord:ClientSecret"] ?? "";
    
    // Explicitly set correlation cookie settings
    options.CorrelationCookie.SameSite = SameSiteMode.Lax;
    options.CorrelationCookie.HttpOnly = true;
    options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;

    options.SaveTokens = true;
    options.Scope.Add("guilds");
    options.Scope.Add("identify");
});

var app = builder.Build();

// Use Forwarded Headers first
app.UseForwardedHeaders();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
}
app.UseStaticFiles();

app.UseCookiePolicy(); // Fix correlation cookie
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

// Set the port from configuration
var port = builder.Configuration.GetValue<int?>("Discord:Port") ?? 3000;
app.Urls.Add($"http://*:{port}");

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
