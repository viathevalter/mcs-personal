$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class ImageResizer {
    public static void Resize(string srcPath, string dstPath, int width, int height, float padPercent, string hexBg) {
        using (Image src = Image.FromFile(srcPath))
        using (Bitmap dst = new Bitmap(width, height, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(dst)) {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.CompositingQuality = CompositingQuality.HighQuality;

            if (!string.IsNullOrEmpty(hexBg)) {
                using (SolidBrush brush = new SolidBrush(ColorTranslator.FromHtml(hexBg))) {
                    g.FillRectangle(brush, 0, 0, width, height);
                }
            } else {
                g.Clear(Color.Transparent);
            }

            int padX = (int)(width * padPercent);
            int padY = (int)(height * padPercent);
            int drawW = width - (2 * padX);
            int drawH = height - (2 * padY);

            g.DrawImage(src, padX, padY, drawW, drawH);
            dst.Save(dstPath, ImageFormat.Png);
        }
        Console.WriteLine("Successfully created: " + dstPath);
    }
}
"@

Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$baseDir = "c:\Projetos IA\Kotrik\mcs-personal\public"
$src = Join-Path $baseDir "icone_mcs.png"

# Standard 192 & 512
[ImageResizer]::Resize($src, (Join-Path $baseDir "icon-192.png"), 192, 192, 0, $null)
[ImageResizer]::Resize($src, (Join-Path $baseDir "icon-512.png"), 512, 512, 0, $null)

# Maskable 192 & 512 with 10% safe zone and dark background #030712
[ImageResizer]::Resize($src, (Join-Path $baseDir "icon-maskable-192.png"), 192, 192, 0.10, "#030712")
[ImageResizer]::Resize($src, (Join-Path $baseDir "icon-maskable-512.png"), 512, 512, 0.10, "#030712")

# Apple Touch Icon 180x180
[ImageResizer]::Resize($src, (Join-Path $baseDir "apple-touch-icon.png"), 180, 180, 0.05, "#030712")
