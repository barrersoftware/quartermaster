using System.Security.Claims;
using AspNet.Security.OAuth.Discord;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Quartermaster.Core.Data;

var builder = WebApplication.CreateBuilder(args);

// Load global configuration from solution root
builder.Configuration.AddJsonFile("../appsettings.json", optional: false, reloadOnChange: true);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.AddHttpClient();
builder.Services.AddScoped<Quartermaster.Web.Services.DiscordApiService>();

// Data Services
var dbPath = builder.Configuration.GetValue<string>("Bot:DatabasePath") ?? "bot.db";
builder.Services.AddSingleton<IDatabaseService>(new SqliteDatabaseService(dbPath));

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

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
