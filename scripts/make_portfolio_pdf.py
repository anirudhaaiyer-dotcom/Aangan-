from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
import textwrap, sys

INK=HexColor("#1E2A26"); MUTED=HexColor("#5E6C67"); CLAY=HexColor("#B4643C"); SAGE=HexColor("#7E9A86")
SAND=HexColor("#EFE6D8"); STONE=HexColor("#D9D2C5"); PAPER=HexColor("#FBF8F3"); GOLD=HexColor("#D9A441")
W,H=A4; M=18*mm
out=sys.argv[1]
c=canvas.Canvas(out,pagesize=A4); c.setTitle("Aangan Studio Portfolio (sample)"); c.setAuthor("Aangan Studio")

def bg(col=PAPER):
    c.setFillColor(col); c.rect(0,0,W,H,stroke=0,fill=1)
def text(x,y,s,font="Helvetica",size=10,col=INK,cs=0):
    c.setFillColor(col); t=c.beginText(x,y); t.setFont(font,size); t.setCharSpace(cs); t.textLine(s); c.drawText(t)
def para(x,y,s,width_chars,font="Helvetica",size=10.5,col=HexColor("#33413C"),lead=1.5):
    c.setFillColor(col); c.setFont(font,size)
    for line in textwrap.wrap(s,width_chars):
        c.drawString(x,y,line); y-=size*lead
    return y
def eyebrow(x,y,s): text(x,y,s.upper(),"Helvetica",8.5,MUTED,1.6)
def foot(left,right):
    c.setStrokeColor(STONE); c.setLineWidth(.6); c.line(M,14*mm,W-M,14*mm)
    text(M,10*mm,left,"Helvetica",7.5,MUTED); c.setFont("Helvetica",7.5); c.drawRightString(W-M,10*mm,right)

# Page 1: cover
bg(SAND)
c.setFillColor(HexColor("#E7DCCB")); c.rect(W-78*mm,H-175*mm,78*mm,175*mm,stroke=0,fill=1)
ax=W-78*mm; aw=78*mm
c.setFillColor(CLAY); p=c.beginPath(); p.moveTo(ax+12*mm,H-175*mm); p.lineTo(ax+12*mm,H-85*mm); p.curveTo(ax+12*mm,H-40*mm,ax+aw-12*mm,H-40*mm,ax+aw-12*mm,H-85*mm); p.lineTo(ax+aw-12*mm,H-175*mm); p.close(); c.drawPath(p,stroke=0,fill=1)
c.setFillColor(SAND); p=c.beginPath(); p.moveTo(ax+20*mm,H-175*mm); p.lineTo(ax+20*mm,H-90*mm); p.curveTo(ax+20*mm,H-58*mm,ax+aw-20*mm,H-58*mm,ax+aw-20*mm,H-90*mm); p.lineTo(ax+aw-20*mm,H-175*mm); p.close(); c.drawPath(p,stroke=0,fill=1)
c.setFillColor(SAGE); c.rect(ax+29*mm,H-175*mm,20*mm,34*mm,stroke=0,fill=1)
c.setFillColor(GOLD); c.circle(ax+39*mm,H-100*mm,5*mm,stroke=0,fill=1)
c.setFillColor(INK); c.rect(ax,H-175*mm,aw,8*mm,stroke=0,fill=1)
eyebrow(M,H-M,"Aangan Studio · Pune")
text(M,95*mm,"Homes and offices,","Times-Roman",44,INK); text(M,78*mm,"designed and built.","Times-Roman",44,INK)
para(M,66*mm,"Interior design with execution for apartments, villas and small offices across Pune and PCMC. 14 designers. One team from first sketch to handover.",80,size=11)
c.setStrokeColor(CLAY); c.setLineWidth(.8); c.rect(M,40*mm,92*mm,7*mm,stroke=1,fill=0)
text(M+3*mm,42.4*mm,"SAMPLE PORTFOLIO · PROJECTS ARE ILLUSTRATIVE","Helvetica",7.5,CLAY,1.2)
foot("Portfolio 2026","aangan studio"); c.showPage()

# Page 2: about
bg()
eyebrow(M,H-M,"About Aangan")
y=H-M-12*mm
for line in ["An aangan is the courtyard at the heart of a home.","We design around how you actually live."]:
    text(M,y,line,"Times-Roman",21,INK); y-=9*mm
col2=M+90*mm; y0=y-6*mm
y=para(M,y0,"We are a 60-person studio in Pune. Every project is designed and executed by our own team and our own network of contractors, so the drawings and the finished room match.",50)
y=para(M,y-4,"We take on full homes, a floor or a few rooms, and offices up to about 3,000 sq ft. Every engagement includes execution: we don't do advice-only visits.",50)
y-=6*mm; text(M,y,"What we do","Helvetica-Bold",11.5); y-=7*mm
for s in ["Space planning and layout","Kitchens and wardrobes","Materials: flooring, walls, ceilings","Lighting design","Custom and sourced furniture","Execution supervision"]:
    c.setStrokeColor(STONE); c.line(M,y+4.5*mm,M+78*mm,y+4.5*mm); text(M,y,s,"Helvetica",10); y-=7.5*mm
yy=y0; text(col2,yy,"How a project runs","Helvetica-Bold",11.5); yy-=9*mm
steps=[("Free consultation.","Your designer visits or calls, understands the brief and walks you through pricing for your site and choices."),
       ("Design, 3-4 weeks.","Layouts, material boards and 3D views, revised with you."),
       ("Execution, 8-16 weeks.","Our contractors build it; your designer supervises on site."),
       ("Handover.","A walkthrough, snag list closed, and care notes for every finish.")]
for i,(h,b) in enumerate(steps,1):
    text(col2,yy-1*mm,str(i),"Times-Roman",20,CLAY)
    text(col2+10*mm,yy,h,"Helvetica-Bold",10)
    yy=para(col2+10*mm,yy-5*mm,b,44,size=10)-3*mm
c.setFillColor(SAND); c.rect(col2,yy-22*mm,W-M-col2,20*mm,stroke=0,fill=1)
para(col2+5*mm,yy-9*mm,"Planning ahead: we need at least 6 weeks before anything must be ready, so book your consultation early.",48,size=10)
foot("About Aangan","2"); c.showPage()

# Page 3: projects
bg()
eyebrow(M,H-M,"Selected work (illustrative)"); text(M,H-M-12*mm,"Recent projects","Times-Roman",24)
cw=(W-2*M-8*mm)/2; ch=62*mm
projects=[("Kothrud 3BHK, full home","1,400 SQ FT · 14 WEEKS","Builder flat turned warm and open: a new modular kitchen, wardrobes in both bedrooms and a living room built around the balcony light.","home"),
 ("Baner startup office","800 SQ FT · 20 SEATS · 10 WEEKS","Bare shell to working office: workstations, a cabin, a meeting room and a break area with acoustic panels.","office"),
 ("Kalyani Nagar villa","5,500 SQ FT · 3 FLOORS · IN PROGRESS","End-to-end design for a new-build villa, with a double-height living room and a courtyard staircase.","villa"),
 ("Baner 2BHK, rented flat","3 ROOMS · NO STRUCTURAL WORK","A reversible makeover: a modular kitchen that comes out cleanly, lighting and furniture, all landlord-approved.","rent")]
for i,(t,meta,desc,kind) in enumerate(projects):
    x=M+(i%2)*(cw+8*mm); top=H-M-22*mm-(i//2)*(ch+42*mm)
    y=top-ch
    c.setFillColor(SAND if kind!="office" else HexColor("#E3E8E4")); c.rect(x,y,cw,ch,stroke=0,fill=1)
    if kind=="home":
        c.setFillColor(HexColor("#C9B79C")); c.rect(x,y,cw,ch*.28,stroke=0,fill=1)
        c.setFillColor(SAGE); c.roundRect(x+cw*.1,y+ch*.28,cw*.38,ch*.3,4,stroke=0,fill=1)
        c.setFillColor(HexColor("#FFFFFF")); c.rect(x+cw*.58,y+ch*.55,cw*.26,ch*.32,stroke=0,fill=1)
        c.setFillColor(CLAY); c.circle(x+cw*.8,y+ch*.36,ch*.07,stroke=0,fill=1)
    elif kind=="office":
        c.setFillColor(HexColor("#9FAFA6")); c.rect(x,y,cw,ch*.26,stroke=0,fill=1)
        c.setFillColor(INK); c.rect(x+cw*.08,y+ch*.45,cw*.3,ch*.06,stroke=0,fill=1); c.rect(x+cw*.44,y+ch*.45,cw*.3,ch*.06,stroke=0,fill=1)
        c.setFillColor(CLAY); c.rect(x+cw*.8,y+ch*.26,cw*.14,ch*.55,stroke=0,fill=1)
        c.setFillColor(HexColor("#FFFFFF")); c.rect(x+cw*.08,y+ch*.65,cw*.66,ch*.22,stroke=0,fill=1)
    elif kind=="villa":
        c.setFillColor(HexColor("#E2D3BB")); p=c.beginPath(); p.moveTo(x,y); p.lineTo(x,y+ch*.52); p.lineTo(x+cw/2,y+ch*.9); p.lineTo(x+cw,y+ch*.52); p.lineTo(x+cw,y); p.close(); c.drawPath(p,stroke=0,fill=1)
        c.setFillColor(SAGE); c.rect(x+cw*.4,y,cw*.2,ch*.45,stroke=0,fill=1)
        c.setFillColor(HexColor("#FFFFFF")); c.rect(x+cw*.14,y+ch*.22,cw*.16,ch*.18,stroke=0,fill=1); c.rect(x+cw*.7,y+ch*.22,cw*.16,ch*.18,stroke=0,fill=1)
    else:
        c.setFillColor(HexColor("#BFA98A")); c.rect(x,y,cw,ch*.22,stroke=0,fill=1)
        c.setFillColor(HexColor("#FFFFFF")); c.rect(x+cw*.12,y+ch*.22,cw*.4,ch*.45,stroke=0,fill=1)
        c.setFillColor(SAGE); c.rect(x+cw*.16,y+ch*.55,cw*.32,ch*.08,stroke=0,fill=1)
        c.setFillColor(CLAY); c.roundRect(x+cw*.6,y+ch*.22,cw*.28,ch*.3,5,stroke=0,fill=1)
    text(x,y-7*mm,t,"Helvetica-Bold",11); text(x,y-12*mm,meta,"Helvetica",7.5,MUTED,.6)
    para(x,y-18*mm,desc,46,size=9.5)
foot("Projects shown are illustrative samples for a case study","3"); c.showPage()

# Page 4: area + consultation
bg()
eyebrow(M,H-M,"Where we work"); text(M,H-M-12*mm,"Pune city and PCMC","Times-Roman",24)
areas=["Kothrud","Baner","Aundh","Wakad","Koregaon Park","Kalyani Nagar","Viman Nagar","Hadapsar","Magarpatta","NIBM","Kondhwa","Undri","Shivane","Warje","Erandwane","Deccan","Pimpri","Chinchwad","Pimple Saudagar","Pimple Nilakh","Ravet","Hinjewadi"]
colw=(W-2*M)/3
for i,a in enumerate(areas):
    text(M+(i//8)*colw,H-M-26*mm-(i%8)*6.5*mm,a,"Helvetica",10.5)
y=H-M-90*mm
c.setFillColor(SAND); c.rect(M,y-30*mm,W-2*M,30*mm,stroke=0,fill=1)
text(M+7*mm,y-9*mm,"Your consultation","Helvetica-Bold",11.5)
para(M+7*mm,y-15*mm,"It's free and comes with no obligation. Your designer will go through the brief, the site and pricing for your choices. Need a different time? Use the reschedule link in your confirmation email, or call the studio and our assistant will move it for you.",100,size=10)
y-=40*mm
c.setStrokeColor(STONE); c.rect(M,y-24*mm,W-2*M,24*mm,stroke=1,fill=0)
text(M+7*mm,y-9*mm,"We don't take on","Helvetica-Bold",11.5)
para(M+7*mm,y-15*mm,"Restaurants, hotels, retail and gyms; structural or architectural work; decor or Vastu advice without execution; projects outside Pune and PCMC.",100,size=10)
foot("Aangan Studio · Pune","4"); c.showPage()
c.save()
