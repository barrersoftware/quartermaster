using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;
using SkiaSharp;

namespace Quartermaster.Core.Services;

public class VisualService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SKTypeface _typeface;

    public VisualService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
        
        // Try to load a system font
        string fontPath = @"C:\Windows\Fonts\arial.ttf";
        if (File.Exists(fontPath))
        {
            _typeface = SKTypeface.FromFile(fontPath);
        }
        else
        {
            _typeface = SKTypeface.Default;
        }
    }

    private async Task<SKBitmap?> LoadBitmapAsync(string? url)
    {
        if (string.IsNullOrEmpty(url)) return null;

        try
        {
            var client = _httpClientFactory.CreateClient();
            var bytes = await client.GetByteArrayAsync(url);
            return SKBitmap.Decode(bytes);
        }
        catch
        {
            return null;
        }
    }

    private void DrawCircularAvatar(SKCanvas canvas, SKBitmap? avatar, float x, float y, float size)
    {
        if (avatar == null) return;

        using var paint = new SKPaint { IsAntialias = true };
        using var path = new SKPath();
        
        float radius = size / 2;
        path.AddCircle(x + radius, y + radius, radius);
        
        canvas.Save();
        canvas.ClipPath(path);
        
        var rect = new SKRect(x, y, x + size, y + size);
        canvas.DrawBitmap(avatar, rect, paint);
        
        canvas.Restore();
    }

    public async Task<byte[]> CreateRankCardAsync(string username, int level, int rank, long currentXp, long requiredXp, string? avatarUrl, string? colorHex, string? backgroundUrl)
    {
        int width = 900;
        int height = 250;

        using var surface = SKSurface.Create(new SKImageInfo(width, height));
        var canvas = surface.Canvas;

        // Background
        using (var bgBitmap = await LoadBitmapAsync(backgroundUrl))
        {
            if (bgBitmap != null)
            {
                canvas.DrawBitmap(bgBitmap, new SKRect(0, 0, width, height));
            }
            else
            {
                canvas.Clear(SKColor.Parse("#23272A"));
            }
        }

        // Avatar
        using (var avatarBitmap = await LoadBitmapAsync(avatarUrl))
        {
            DrawCircularAvatar(canvas, avatarBitmap, 40, 35, 180);
        }

        // Progress Bar
        float progress = Math.Clamp((float)currentXp / requiredXp, 0, 1);
        var barRect = new SKRect(260, 160, 860, 200);
        
        using (var paint = new SKPaint { Color = SKColor.Parse("#484B4E") })
        {
            canvas.DrawRect(barRect, paint);
        }
        
        using (var paint = new SKPaint { Color = SKColor.Parse(colorHex ?? "#5865F2") })
        {
            var progressRect = new SKRect(260, 160, 260 + (600 * progress), 200);
            canvas.DrawRect(progressRect, paint);
        }

        // Text
        using (var font = new SKFont(_typeface, 32))
        using (var paint = new SKPaint { Color = SKColors.White, IsAntialias = true })
        {
            canvas.DrawText(username, 260, 85, font, paint);

            font.Size = 18;
            canvas.DrawText($"RANK #{rank}  |  LEVEL {level}", 260, 130, font, paint);
            canvas.DrawText($"{currentXp:N0} / {requiredXp:N0} XP", 700, 130, font, paint);
        }

        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    public async Task<byte[]> CreateWelcomeCardAsync(string username, int memberCount, string? avatarUrl, string? backgroundUrl)
    {
        int width = 1024;
        int height = 450;

        using var surface = SKSurface.Create(new SKImageInfo(width, height));
        var canvas = surface.Canvas;

        using (var bgBitmap = await LoadBitmapAsync(backgroundUrl))
        {
            if (bgBitmap != null)
            {
                canvas.DrawBitmap(bgBitmap, new SKRect(0, 0, width, height));
            }
            else
            {
                canvas.Clear(SKColor.Parse("#23272A"));
            }
        }

        using (var avatarBitmap = await LoadBitmapAsync(avatarUrl))
        {
            DrawCircularAvatar(canvas, avatarBitmap, (width - 250) / 2, 50, 250);
        }

        using (var font = new SKFont(_typeface, 64))
        using (var paint = new SKPaint { Color = SKColors.White, IsAntialias = true })
        {
            float welcomeX = (width - font.MeasureText("WELCOME")) / 2;
            canvas.DrawText("WELCOME", welcomeX, 360, font, paint);

            font.Size = 32;
            string subText = $"{username}  |  Member #{memberCount}";
            float subX = (width - font.MeasureText(subText)) / 2;
            canvas.DrawText(subText, subX, 410, font, paint);
        }

        using var image = surface.Snapshot();
        using var data = image.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }
}
