"""Author original Eightfold SVG illustrations from geometric vector primitives. No external assets."""
from pathlib import Path
import math

OUT = Path(__file__).resolve().parents[1] / 'public' / 'art'
OUT.mkdir(parents=True, exist_ok=True)

PALETTES = [
    ('#e8ead8','#a1b284','#6e8f66','#45684f','#d9ceaa'),
    ('#eee9d7','#bdba8b','#879472','#576e58','#d9bd83'),
    ('#e7ecdd','#afbf9a','#75947c','#4d7360','#d1c9a5'),
    ('#e3e9d9','#a1b391','#6d8c70','#3f6856','#c4bc96'),
    ('#e9eadb','#aeb795','#7d9779','#4c725c','#d3c29c'),
    ('#e7e9dd','#a4b29f','#728e7d','#4c6f63','#c9bea2'),
    ('#dfe8df','#9eb4a5','#6c8e7e','#3f6c60','#bfc6aa'),
    ('#dce6e4','#8ea9a4','#577e80','#365b68','#b6c8bf'),
]

def poly(points, fill, stroke='', width=1):
    return f'<polygon points="{" ".join(f"{x},{y}" for x,y in points)}" fill="{fill}"' + (f' stroke="{stroke}" stroke-width="{width}" stroke-linejoin="round"' if stroke else '') + '/>'

def line(x,y,xx,yy,color,width=2,opacity=1):
    return f'<path d="M{x} {y}L{xx} {yy}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" opacity="{opacity}"/>'

def ellipse(x,y,rx,ry,color,opacity=1):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{color}" opacity="{opacity}"/>'

def block(x,y,w,d,h,colors):
    a,b,c=colors
    return poly([(x,y-h),(x+w,y+d-h),(x,y+2*d-h),(x-w,y+d-h)],a)+poly([(x-w,y+d-h),(x,y+2*d-h),(x,y+2*d),(x-w,y+d)],b)+poly([(x,y+2*d-h),(x+w,y+d-h),(x+w,y+d),(x,y+2*d)],c)

def tree(x,y,scale,pal,kind=0):
    _,_,light,dark,_=pal
    s=f'<g transform="translate({x} {y}) scale({scale})">'+ellipse(0,2,22,8,dark,.17)+line(0,0,0,-40,'#7b8061',6)
    if kind==1:
        for k in range(3):s+=poly([(-25+k*3,-18-k*13),(0,-65-k*2),(25-k*3,-18-k*13),(0,-8-k*13)],light if k%2 else dark)
    elif kind==2:
        s+=line(0,-27,4,-72,'#8d9070',6)
        for dx,dy in [(-34,-67),(-25,-82),(2,-89),(28,-80),(37,-64)]:s+=f'<path d="M4 -72Q{dx/2} {dy-12} {dx} {dy}" stroke="{light}" stroke-width="9" stroke-linecap="round" fill="none"/>'
    elif kind==3:
        s+=poly([(-14,-8),(-9,-54),(0,-74),(11,-43),(16,-12),(0,-2)],'#a1c9bc')+poly([(0,-74),(11,-43),(16,-12),(0,-2)],light)+line(-5,-18,-2,-53,'#d3e8d4',2)
    else:
        s+=ellipse(-12,-34,20,22,dark)+ellipse(11,-38,24,22,light)+ellipse(-4,-55,23,22,light)+ellipse(-9,-59,13,13,'#b5c497',.55)
    return s+'</g>'

def flag(x,y,color='#4eb4a0',scale=1):
    return f'<g transform="translate({x} {y}) scale({scale})">'+ellipse(0,2,10,4,'#345e4e',.2)+line(0,0,0,-72,'#e4dfc2',3)+poly([(1,-72),(34,-67),(33,-47),(1,-52)],color)+line(5,-65,23,-61,'#d8f0ce',1.5,.8)+'</g>'

def soldier(x,y,era,role='frontline',color='#54b6a0',scale=1):
    s=f'<g transform="translate({x} {y}) scale({scale})">'+ellipse(0,1,9,3,'#244f3e',.25)
    s+=line(-3,-8,-5,0,'#38574a',3)+line(3,-8,5,0,'#38574a',3)
    s+=poly([(-6,-21),(5,-21),(7,-8),(0,-5),(-7,-8)],'#e4dfbe')+poly([(-6,-21),(-9,-8),(-3,-6),(0,-20)],color)
    s+=ellipse(0,-26,4.5,5,'#c7b68d')
    if era==0:s+=poly([(-5,-29),(-4,-33),(3,-32),(5,-28)],'#675f46')
    elif era<4:s+=poly([(-5,-26),(-5,-32),(2,-35),(6,-29),(5,-25)],'#d0cfac')+line(0,-34,4,-38,color,3)
    else:s+=poly([(-6,-27),(-4,-33),(3,-34),(7,-28)],'#658271')+line(1,-28,6,-28,'#c8ddbe',2)
    if role=='ranged' and era<4:s+=f'<path d="M11 -32Q28 -19 11 -5Z" fill="none" stroke="#b4a173" stroke-width="2"/>'+line(6,-18,25,-21,'#ddd0a8',1.5)
    elif role=='guard':s+=poly([(-13,-25),(-4,-24),(-2,-10),(-10,-6),(-15,-12)],color,'#315e4e')
    elif era<4:s+=line(11,0,12,-40,'#8f825c',2)+poly([(9,-39),(13,-46),(16,-39)],'#d5d3ae')
    else:s+=line(7,-18,25,-23,'#405e4e',4)+line(11,-18,15,-11,'#405e4e',3)
    return s+'</g>'

def building(era):
    stone=('#e6dcc0','#a0ab8b','#c1c6a4')
    if era==7:stone=('#cadbd0','#5b8584','#8bb2a3')
    s=ellipse(0,36,135,44,'#345c4c',.16)
    if era==0:
        for i in range(23):
            a=i/23*math.pi*2;x=math.cos(a)*116;y=math.sin(a)*45+20
            if y<45:s+=line(round(x),round(y),round(x),round(y-30),'#8a8b61',7)
        s+=block(-21,1,67,31,33,('#b4ac7b','#8e8b5f','#a39d6d'))
        s+=poly([(-113,-28),(-21,-122),(72,-28),(-21,19)],'#d4c59a')+poly([(-21,-122),(72,-28),(-21,19)],'#b3a778')
        for i in range(4):s+=line(-21,-115,-80+i*24,-29,'#b2a371',1.5)
        s+=poly([(-42,-8),(-18,-21),(-18,41),(-42,27)],'#526446')
        s+=poly([(48,5),(88,-61),(128,5),(88,25)],'#bdb487')+poly([(88,-61),(128,5),(88,25)],'#999c6e')
        s+=line(-5,54,12,38,'#e5d7ad',6)+line(-5,38,12,54,'#e5d7ad',6)+ellipse(4,45,9,6,'#dbaf72')
    elif era==1:
        for y,w,h in [(18,116,27),(-15,87,35),(-49,58,35),(-82,30,25)]:s+=block(0,y,w,w*.43,h,('#e0c69a','#a6a27b','#c7b68a'))
        for k in range(8):s+=block(-40+k*7,64-k*8,14,5,4,stone)
        for x in [-31,-11,10,30]:s+=line(x,-38,x,-57,'#7a7957',5)
        s+=block(0,-105,17,8,17,('#eed7b3','#aca37c','#d2bf94'))
    elif era==2:
        s+=block(0,17,120,52,13,stone)+block(0,-1,101,42,12,stone)
        for x in [-74,-45,-15,15,45,74]:s+=line(x,-69,x,-8,'#efe4c2',13)+line(x-8,-68,x+8,-68,'#c1c5a3',4)+line(x-8,-8,x+8,-8,'#adb797',4)
        s+=poly([(-116,-73),(0,-142),(116,-73),(0,-20)],'#eee2bf')+poly([(-116,-73),(0,-142),(0,-105)],'#9dad92')+poly([(0,-142),(116,-73),(0,-20),(0,-44),(90,-83)],'#c6cbab')
        s+=poly([(-55,-69),(0,-99),(55,-69),(0,-43)],'#d5d6b4')
    elif era==3:
        s+=block(0,10,114,50,55,stone)+block(0,-36,55,24,85,stone)
        for x,y in [(-86,-1),(86,-1),(0,57)]:
            s+=block(x,y,29,13,72,stone)+block(x,y-72,35,15,12,stone)
            for q in [-25,-8,9,26]:s+=block(x+q,y-83,5,3,10,stone)
        s+=poly([(-76,-15),(-48,-31),(-48,24),(-76,41)],'#4c6853')
        s+=line(0,-97,0,-74,'#5b735d',6)
    elif era==4:
        s+=poly([(-156,7),(-116,-25),(-111,-63),(-50,-45),(0,-76),(52,-44),(117,-62),(116,-20),(156,17),(100,48),(48,42),(0,74),(-53,42),(-105,47)],'#99aa86')
        s+=poly([(-156,7),(-105,47),(-53,42),(0,74),(48,42),(100,48),(156,17),(156,36),(100,67),(48,60),(0,93),(-53,61),(-105,65),(-156,25)],'#809779')
        s+=block(0,-7,91,40,45,stone)+block(0,-54,49,21,30,stone)+poly([(-62,-81),(0,-121),(62,-81),(0,-50)],'#799b86')
        for x in [-87,87]:s+=ellipse(x,22,17,9,'#4e705b')+line(x,15,x+38,0,'#405f50',10)
    elif era==5:
        s+=block(-15,10,98,43,66,('#cdbb94','#a4a181','#b6ab87'))+poly([(-113,-56),(-15,-112),(83,-56),(-15,-13)],'#6d8b78')
        for x in [-76,-48,-20,8,36,64]:s+=line(x,-29,x,-3,'#5a7d68',9)
        s+=block(69,-43,19,8,93,('#d0c39f','#999d7d','#b6b18d'))
        s+=ellipse(69,-135,19,7,'#789680',.4)+ellipse(78,-157,28,10,'#b5c3a7',.5)+ellipse(93,-179,35,13,'#d4d8bd',.65)
        s+=block(-77,44,35,16,24,stone)
    elif era==6:
        s+=block(-15,17,101,43,55,stone)+poly([(-116,-37),(-15,-87),(86,-37),(-15,9)],'#b4c6ac')+block(34,-44,34,16,58,stone)
        for x in [-79,-55,-31,-7]:s+=poly([(x,-12),(x+14,-19),(x+14,9),(x,16)],'#5c8771')
        s+=line(34,-90,34,-164,'#d5dfc0',4)+line(1,-131,69,-131,'#8eb49a',4)+line(15,-151,54,-151,'#8eb49a',3)+ellipse(34,-163,7,6,'#7dd0ab')
        s+=ellipse(86,45,35,15,'#78977d')+line(75,34,117,11,'#b7cbae',8)
    else:
        s+=poly([(-150,23),(-94,-30),(5,-67),(123,-9),(153,45),(33,90),(-78,65)],'#547e80')
        s+=poly([(-128,9),(-70,-54),(0,-105),(87,-61),(124,3),(0,58)],'#c7d9cb')+poly([(0,-105),(87,-61),(124,3),(0,58)],'#88afa2')
        s+=poly([(-55,-42),(0,-80),(55,-42),(0,-12)],'#7ad0bd')+poly([(-36,-42),(0,-68),(36,-42),(0,-21)],'#c8f0ce')
        for x in [-112,112]:s+=block(x,0,17,7,67,stone)+ellipse(x,-65,10,6,'#a5f0ce')
        s+=line(-95,16,-36,47,'#9ce9c7',4)+line(36,47,93,17,'#9ce9c7',4)+line(0,-96,0,-165,'#d0e6ce',3)+ellipse(0,-164,9,8,'#9ef1d0')
        s+=f'<ellipse cx="0" cy="-92" rx="93" ry="23" fill="none" stroke="#8fc7b1" stroke-width="2" opacity=".5" transform="rotate(-15 0 -92)"/>'
    return s

for era,pal in enumerate(PALETTES):
    sky,ground,light,dark,sand=pal
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 560" role="img" aria-label="Original isometric era {era+1} stronghold illustration"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="{sky}"/><stop offset="1" stop-color="#f3efdf"/></linearGradient><linearGradient id="river" x2="1" y2="1"><stop stop-color="#91b8a7"/><stop offset="1" stop-color="#639d94"/></linearGradient><clipPath id="island"><path d="M115 298L499 112 892 301 506 496Z"/></clipPath></defs><path fill="url(#sky)" d="M0 0H1000V560H0Z"/>'''
    svg+=ellipse(724,117,114,114,'#f4edd0',.7)+f'<circle cx="724" cy="117" r="132" fill="none" stroke="{dark}" stroke-width="1" opacity=".09"/>'
    svg+=ellipse(510,483,329,32,dark,.07)
    svg+=poly([(115,298),(506,496),(506,519),(115,321)],dark)+poly([(506,496),(892,301),(892,324),(506,519)],light)
    svg+=poly([(115,298),(499,112),(892,301),(506,496)],ground)
    svg+='<g clip-path="url(#island)">'
    for k in range(15):
        svg+=line(60+k*64,246-k*0.5,500+k*64,466-k*.5,'#f1edce',.7,.14)
        svg+=line(70+k*64,460,520+k*64,235,'#f1edce',.7,.14)
    svg+=f'<path d="M120 317Q233 235 336 295T549 347T800 355L840 386Q698 346 573 390T324 339T112 354Z" fill="url(#river)"/>'
    for x,y in [(215,309),(263,299),(576,365),(644,360),(744,349)]:svg+=line(x,y,x+40,y-11,'#d7e9cc',2,.6)+line(x+12,y+8,x+30,y+3,'#d7e9cc',1,.5)
    svg+=f'<path d="M294 229L449 305 570 244 682 300 718 282 571 209 450 270 331 212Z" fill="{sand}" opacity=".9"/>'
    svg+=poly([(404,315),(455,289),(506,315),(455,341)],'#d6c59c')
    for k in range(7):svg+=line(411+k*7,314-k*3.5,454+k*7,335-k*3.5,'#948c68',1.7)
    svg+=line(404,313,455,287,'#efe0ba',3)+line(456,341,507,315,'#efe0ba',3)
    svg+='</g>'
    for x,y,sc in [(280,240,.9),(319,226,.85),(355,210,.65),(765,314,.85),(797,295,.75),(750,273,.68),(223,327,.65)]:svg+=tree(x,y,sc,pal,3 if era==7 else 2 if era in [1,2] else 1 if era==3 else 0)
    svg+=f'<g transform="translate(551 253)">{building(era)}</g>'
    svg+=flag(664,268,scale=.9)
    for x,y in [(372,376),(402,390),(433,405)]:svg+=soldier(x,y,era,'guard',scale=1.03)
    for x,y in [(440,353),(469,369),(497,384)]:svg+=soldier(x,y,era,'ranged',scale=1.03)
    svg+=flag(332,366,scale=.68)
    for x,y,sc in [(631,435,.73),(669,417,.64),(703,398,.58),(177,311,.55)]:svg+=tree(x,y,sc,pal,3 if era==7 else 1 if era in [3,5] else 0)
    svg+=poly([(725,345),(735,328),(755,322),(773,338),(758,350),(741,353)],'#a7b599')+poly([(755,322),(773,338),(758,350)],'#819b81')
    for x,y in [(253,368),(572,441),(614,411),(350,297)]:svg+=line(x,y,x+7,y-3,sand,2)+line(x+4,y-5,x+9,y-7,sand,1.5)
    svg+=f'<path d="M180 173q8 -8 16 0q8 -8 16 0M213 150q6 -6 12 0q6 -6 12 0" fill="none" stroke="{dark}" stroke-width="2" stroke-linecap="round" opacity=".35"/>'
    svg+='</svg>'
    (OUT/f'era-{era+1}.svg').write_text(svg)

(OUT/'icon.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="#223e35"/><path d="M31 81L96 45 161 81 96 117Z" fill="#b6d3b3"/><path d="M31 81V112L96 149V117Z" fill="#68b5a0"/><path d="M96 117L161 81V112L96 149Z" fill="#3e8b79"/><path d="M75 78V53L96 41 117 53V78L96 90Z" fill="#e3dfbd"/><path d="M96 41V66L117 78V53Z" fill="#c3cfa9"/><path d="M96 40V20M96 20L125 26 125 42 96 36" fill="#68cbb1" stroke="#68cbb1" stroke-width="4" stroke-linejoin="round"/></svg>''')

print('Authored eight era illustrations and icon.svg.')
