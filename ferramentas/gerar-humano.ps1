# =====================================================================
#  Gera assets/personagens/humano.png a partir do xxg_4.png (Espadachim Escarlate)
#  Troca a armadura vermelha por azul-aço e a pele pálida por tom de pele humana.
#  Uso (PowerShell, na pasta do projeto):   .\ferramentas\gerar-humano.ps1
# =====================================================================
$raiz = Split-Path -Parent $PSScriptRoot
$entrada = Join-Path $raiz 'assets\personagens\xxg_4.png'
$saida = Join-Path $raiz 'assets\personagens\humano.png'
if (-not (Test-Path $entrada)) { Write-Error "Não achei $entrada. Coloque as folhas do pacote em assets\personagens primeiro."; exit 1 }

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class Recolor {
  static void ToHsv(int r,int g,int b,out double h,out double s,out double v){
    double R=r/255.0,G=g/255.0,B=b/255.0; double mx=Math.Max(R,Math.Max(G,B)), mn=Math.Min(R,Math.Min(G,B)); v=mx; double d=mx-mn; s=mx==0?0:d/mx;
    if(d==0){h=0;return;} if(mx==R) h=60*(((G-B)/d)%6); else if(mx==G) h=60*((B-R)/d+2); else h=60*((R-G)/d+4); if(h<0)h+=360; }
  static void FromHsv(double h,double s,double v,out int r,out int g,out int b){
    double c=v*s, x=c*(1-Math.Abs((h/60)%2-1)), m=v-c; double R=0,G=0,B=0;
    if(h<60){R=c;G=x;} else if(h<120){R=x;G=c;} else if(h<180){G=c;B=x;} else if(h<240){G=x;B=c;} else if(h<300){R=x;B=c;} else {R=c;B=x;}
    r=Math.Max(0,Math.Min(255,(int)Math.Round((R+m)*255))); g=Math.Max(0,Math.Min(255,(int)Math.Round((G+m)*255))); b=Math.Max(0,Math.Min(255,(int)Math.Round((B+m)*255))); }
  public static void Run(string inp, string outp){
    var bmp=new Bitmap(inp); int W=bmp.Width,H=bmp.Height;
    var d=bmp.LockBits(new Rectangle(0,0,W,H),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
    byte[] px=new byte[d.Stride*H]; Marshal.Copy(d.Scan0,px,0,px.Length);
    int n=(W/256)*(H/256);
    for(int f=0;f<n;f++){
      int cx=(f%4)*256, cy=(f/4)*256; int top=999;
      for(int y=0;y<256&&top==999;y++) for(int x=0;x<256;x++){ if(px[(cy+y)*d.Stride+(cx+x)*4+3]>40){top=y;break;} }
      if(top==999) continue;
      long sx=0; int cnt=0;
      for(int y=top;y<top+12;y++) for(int x=0;x<256;x++){ if(px[(cy+y)*d.Stride+(cx+x)*4+3]>40){sx+=x;cnt++;} }
      int headX=cnt>0?(int)(sx/cnt):128;
      for(int y=0;y<256;y++) for(int x=0;x<256;x++){
        int i=(cy+y)*d.Stride+(cx+x)*4; if(px[i+3]==0) continue;
        int b=px[i],g=px[i+1],r=px[i+2]; double h,s,v; ToHsv(r,g,b,out h,out s,out v);
        bool vermelho=(h<25||h>300)&&s>0.22&&v>0.12;
        bool pele=y<top+30 && Math.Abs(x-headX)<16 && s<0.22 && v>0.45;
        if(vermelho){ h=215; s=Math.Min(1,s*0.55); v=Math.Min(1,v*1.25); }
        else if(pele){ h=24; s=0.18+0.22*(1-v)+0.08; v=Math.Min(1,v*0.97); }
        else continue;
        int R,G,B; FromHsv(h,s,v,out R,out G,out B); px[i]=(byte)B; px[i+1]=(byte)G; px[i+2]=(byte)R;
      }
    }
    Marshal.Copy(px,0,d.Scan0,px.Length); bmp.UnlockBits(d); bmp.Save(outp,ImageFormat.Png); bmp.Dispose();
  }
}
"@
[Recolor]::Run($entrada, $saida)
Write-Host "Pronto: $saida"
