using System.Security.Claims;
using AspNet.Security.OAuth.Discord;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Quartermaster.Core.Data;

var builder = WebApplication.CreateBuilder(args);

// Add service support
builder.Host.UseWindowsService(options => options.ServiceName = "QuartermasterWeb");
builder.Host.UseSystemd();

// Robust configuration loading
string configName = "appsettings.json";
string configPath = "";

if (File.Exists(configName)) configPath = Path.GetFullPath(configName);
else if (File.Exists(Path.Combine(AppContext.BaseDirectory, configName))) configPath = Path.Combine(AppContext.BaseDirectory, configName);
else if (File.Exists(Path.Combine("..", configName))) configPath = Path.GetFullPath(Path.Combine("..", configName));

if (string.IsNullOrEmpty(configPath))
{
    // Web needs to stay alive if possible, or fail gracefully
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
})
.AddDiscord(options =>
{
    options.ClientId = builder.Configuration["Discord:ClientId"] ?? "";
    options.ClientSecret = builder.Configuration["Discord:ClientSecret"] ?? "";
    
    var callbackUrl = builder.Configuration["Discord:CallbackUrl"];
    if (!string.IsNullOrEmpty(callbackUrl))
    {
        options.CallbackPath = new PathString("/callback");
    }

    options.SaveTokens = true;
    options.Scope.Add("guilds");
    options.Scope.Add("identify");
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
}
app.UseStaticFiles();

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
