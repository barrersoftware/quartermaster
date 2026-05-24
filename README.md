# 🏴‍☠️ Quartermaster .NET

**Quartermaster .NET** is an enterprise-grade, high-performance Discord community management suite. This is the **C# / .NET 10** rewrite of the original JavaScript bot, re-engineered for maximum stability, scalability, and type safety.

## 🚀 Why .NET?

- **Enterprise Stability:** Statically typed architecture prevents common runtime errors found in JS.
- **Multi-Threaded Performance:** Built on the .NET 10 asynchronous core for lightning-fast response times.
- **Unified Ecosystem:** Unified Bot engine and Web Dashboard in a single, high-performance solution.
- **Pro Graphics:** High-fidelity Image generation using `ImageSharp`.

## 💎 Premium Features (Included Free)

- **MEE6 Migration Engine:** One-click import for all leveling and XP data. Zero progress lost.
- **Cubic Leveling Math:** Exact replication of the MEE6 progression curve for perfect compatibility.
- **Advanced Auto-Mod:** 7 layers of protection (Spam, Links, Invites, Bad Words, Emoji, Caps, Mentions).
- **Pirate Economy:** Integrated gold system with Casino games (Blackjack, Coinflip) and a Server Shop.
- **Voice XP Engine:** Reward members for being active in voice channels.
- **Smart Triggers:** Prefix-free automated responses and custom commands.
- **Web Audit Logs:** Permanent, searchable database of all server events.

## 🛠️ Architecture

- **Language:** C# (.NET 10)
- **Bot Framework:** [Discord.Net](https://github.com/discord-net/Discord.Net)
- **Web Framework:** ASP.NET Core MVC
- **Data Layer:** Dapper + Microsoft.Data.Sqlite
- **Visuals:** SixLabors.ImageSharp

## 📦 Installation

1.  **Clone the branch:**
    ```bash
    git clone -b Csharp https://github.com/barrersoftware/quartermaster.git
    ```
2.  **Configure:**
    Update `appsettings.json` with your Discord Bot Token, Client ID, and Client Secret.
3.  **Run:**
    ```powershell
    .\start.ps1
    ```

## 💾 Database Migration
The .NET version is **100% compatible** with the legacy `bot.db` from the JavaScript version. Simply point the `DatabasePath` in `appsettings.json` to your existing database file, and everything will sync instantly.

---
*Built with ❤️ for the g4turbo community by ssfdre38 & Gemini CLI.*
