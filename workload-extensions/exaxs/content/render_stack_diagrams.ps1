# Regenerate the conceptual stack PNGs used by the ExaDB-XS documentation.
Add-Type -AssemblyName System.Drawing

function New-StackDiagram {
    param(
        [string] $OutputPath,
        [bool] $MultiStack
    )

    $bitmap = [System.Drawing.Bitmap]::new(720, 258)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear([System.Drawing.Color]::White)

    $foundationFill = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(232, 244, 245))
    $extensionFill = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 240, 215))
    $foundationStackFill = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(200, 229, 223))
    $extensionStackFill = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(248, 219, 173))
    $foundationInk = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(23, 61, 64))
    $extensionInk = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(86, 59, 22))
    $foundationPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(77, 125, 128), 2)
    $extensionPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(164, 119, 51), 2)
    $heading = [System.Drawing.Font]::new('Arial', 22, [System.Drawing.FontStyle]::Bold)
    $body = [System.Drawing.Font]::new('Arial', 15)
    $stackFont = [System.Drawing.Font]::new('Arial', 20, [System.Drawing.FontStyle]::Bold)
    $center = [System.Drawing.StringFormat]::new()
    $center.Alignment = [System.Drawing.StringAlignment]::Center
    $center.LineAlignment = [System.Drawing.StringAlignment]::Center

    try {
        $graphics.FillRectangle($foundationFill, 18, 18, 328, 150)
        $graphics.DrawRectangle($foundationPen, 18, 18, 328, 150)
        $graphics.FillRectangle($extensionFill, 374, 18, 328, 150)
        $graphics.DrawRectangle($extensionPen, 374, 18, 328, 150)

        $graphics.DrawString('One-OE', $heading, $foundationInk, [System.Drawing.RectangleF]::new(18, 31, 328, 32), $center)
        $foundationLine = if ($MultiStack) { 'Existing landing zone foundation' } else { 'New landing zone foundation' }
        $graphics.DrawString($foundationLine, $body, $foundationInk, [System.Drawing.RectangleF]::new(18, 70, 328, 24), $center)
        $graphics.DrawString('Compartments, identity, network', $body, $foundationInk, [System.Drawing.RectangleF]::new(18, 101, 328, 24), $center)
        $graphics.DrawString('Security and observability', $body, $foundationInk, [System.Drawing.RectangleF]::new(18, 129, 328, 24), $center)

        $graphics.DrawString('WE ExaDB-XS', $heading, $extensionInk, [System.Drawing.RectangleF]::new(374, 31, 328, 32), $center)
        $graphics.DrawString('Storage Vaults and VM Clusters', $body, $extensionInk, [System.Drawing.RectangleF]::new(374, 70, 328, 24), $center)
        $graphics.DrawString('Database scope and IAM', $body, $extensionInk, [System.Drawing.RectangleF]::new(374, 101, 328, 24), $center)
        $graphics.DrawString('Events, alarms, notifications', $body, $extensionInk, [System.Drawing.RectangleF]::new(374, 129, 328, 24), $center)

        $graphics.DrawLine($foundationPen, 182, 169, 182, 192)
        $graphics.DrawLine($extensionPen, 538, 169, 538, 192)
        if ($MultiStack) {
            $graphics.FillRectangle($foundationStackFill, 18, 192, 328, 48)
            $graphics.DrawRectangle($foundationPen, 18, 192, 328, 48)
            $graphics.FillRectangle($extensionStackFill, 374, 192, 328, 48)
            $graphics.DrawRectangle($extensionPen, 374, 192, 328, 48)
            $graphics.DrawString('Foundation stack', $stackFont, $foundationInk, [System.Drawing.RectangleF]::new(18, 194, 328, 44), $center)
            $graphics.DrawString('Extension stack', $stackFont, $extensionInk, [System.Drawing.RectangleF]::new(374, 194, 328, 44), $center)
        } else {
            $graphics.FillRectangle($foundationStackFill, 18, 192, 684, 48)
            $graphics.DrawRectangle($foundationPen, 18, 192, 684, 48)
            $graphics.DrawString('One coordinated stack', $stackFont, $foundationInk, [System.Drawing.RectangleF]::new(18, 194, 684, 44), $center)
        }

        $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
        $center.Dispose()
        $stackFont.Dispose()
        $body.Dispose()
        $heading.Dispose()
        $extensionPen.Dispose()
        $foundationPen.Dispose()
        $extensionInk.Dispose()
        $foundationInk.Dispose()
        $extensionStackFill.Dispose()
        $foundationStackFill.Dispose()
        $extensionFill.Dispose()
        $foundationFill.Dispose()
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

New-StackDiagram -OutputPath (Join-Path $PSScriptRoot 'Single.png') -MultiStack $false
New-StackDiagram -OutputPath (Join-Path $PSScriptRoot 'Multi.png') -MultiStack $true
