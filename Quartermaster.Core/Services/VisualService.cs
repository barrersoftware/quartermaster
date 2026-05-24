using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace Quartermaster.Core.Services;

public class VisualService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly FontCollection _fontCollection;
    private readonly FontFamily _fontFamily;

    public VisualService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
        _fontCollection = new FontCollection();
        
        // Try to load a system font on Windows
        string fontPath = @"C:\Windows\Fonts\arial.ttf";
        if (File.Exists(fontPath))
        {
            _fontFamily = _fontCollection.Add(fontPath);
        }
        else
        {
            // Fallback or handle appropriately
            // For a global release, we should bundle a font file
            throw new FileNotFoundException("Required font file not found at " + fontPath);
        }
    }

    private async Task<Image<Rgba32>> LoadImageAsync(string? url, int width, int height, Color fallbackColor)
    {
        if (string.IsNullOrEmpty(url))
        {
            return new Image<Rgba32>(width, height, fallbackColor);
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            var bytes = await client.GetByteArrayAsync(url);
            var image = Image.Load<Rgba32>(bytes);
            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Size = new Size(width, height),
                Mode = ResizeMode.Crop
            }));
            return image;
        }
        catch
        {
            return new Image<Rgba32>(width, height, fallbackColor);
        }
    }

    private static IPath CreateCircularPath(int x, int y, int radius)
    {
        return new EllipsePolygon(x, y, radius * 2);
    }

    private void ApplyCircularMask(Image image)
    {
        int size = Math.Min(image.Width, image.Height);
        var radius = size / 2;
        var center = new PointF(radius, radius);
        
        image.Mutate(x => x.Clip(new EllipsePolygon(center, radius)));
    }

    public async Task<byte[]> CreateRankCardAsync(string username, int level, int rank, long currentXp, long requiredXp, string? avatarUrl, string? colorHex, string? backgroundUrl)
    {
        int width = 900;
        int height = 250;

        Color themeColor = Color.ParseHex(colorHex ?? "#5865F2");
        Color bgColor = Color.ParseHex("#23272A");

        using var image = await LoadImageAsync(backgroundUrl, width, height, bgColor);
        using var avatar = await LoadImageAsync(avatarUrl, 180, 180, Color.Transparent);

        // Circular Avatar
        avatar.Mutate(x => {
            x.Resize(180, 180);
            var radius = 90;
            var center = new PointF(radius, radius);
            x.Clip(new EllipsePolygon(center, radius));
        });

        // Composite Avatar
        image.Mutate(x => x.DrawImage(avatar, new Point(40, 35), 1f));

        // Progress Bar
        int barWidth = 600;
        int barHeight = 40;
        int barX = 260;
        int barY = 160;

        image.Mutate(x => {
            // Background Bar
            x.Fill(Color.ParseHex("#484B4E"), new RectangularPolygon(barX, barY, barWidth, barHeight));

            // Progress Fill
            float progress = Math.Clamp((float)currentXp / requiredXp, 0, 1);
            if (progress > 0)
            {
                x.Fill(themeColor, new RectangularPolygon(barX, barY, (int)(barWidth * progress), barHeight));
            }
        });

        // Text
        var fontBig = _fontFamily.CreateFont(32, FontStyle.Bold);
        var fontSmall = _fontFamily.CreateFont(18, FontStyle.Regular);

        image.Mutate(x => {
            x.DrawText(username, fontBig, Color.White, new PointF(260, 60));
            x.DrawText($"RANK #{rank}  |  LEVEL {level}", fontSmall, Color.White, new PointF(260, 110));
            x.DrawText($"{currentXp:N0} / {requiredXp:N0} XP", fontSmall, Color.White, new PointF(700, 110));
        });

        using var ms = new MemoryStream();
        await image.SaveAsPngAsync(ms);
        return ms.ToArray();
    }

    public async Task<byte[]> CreateWelcomeCardAsync(string username, int memberCount, string? avatarUrl, string? backgroundUrl)
    {
        int width = 1024;
        int height = 450;
        Color bgColor = Color.ParseHex("#23272A");

        using var image = await LoadImageAsync(backgroundUrl, width, height, bgColor);
        using var avatar = await LoadImageAsync(avatarUrl, 250, 250, Color.Transparent);

        // Circular Avatar
        avatar.Mutate(x => {
            x.Resize(250, 250);
            var radius = 125;
            var center = new PointF(radius, radius);
            x.Clip(new EllipsePolygon(center, radius));
        });

        // Composite Avatar (Centered)
        image.Mutate(x => x.DrawImage(avatar, new Point((width - 250) / 2, 50), 1f));

        // Text
        var fontBig = _fontFamily.CreateFont(64, FontStyle.Bold);
        var fontSmall = _fontFamily.CreateFont(32, FontStyle.Regular);

        image.Mutate(x => {
            // "WELCOME" centered
            var welcomeText = "WELCOME";
            x.DrawText(new RichTextOptions(fontBig) { 
                HorizontalAlignment = HorizontalAlignment.Center,
                Origin = new PointF(width / 2, 320)
            }, welcomeText, Color.White);

            // Username centered
            var subText = $"{username}  |  Member #{memberCount}";
            x.DrawText(new RichTextOptions(fontSmall) { 
                HorizontalAlignment = HorizontalAlignment.Center,
                Origin = new PointF(width / 2, 390)
            }, subText, Color.White);
        });

        using var ms = new MemoryStream();
        await image.SaveAsPngAsync(ms);
        return ms.ToArray();
    }
}
