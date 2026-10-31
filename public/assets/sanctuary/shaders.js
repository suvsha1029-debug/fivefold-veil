export const skyVertex=`varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
export const skyFragment=`precision highp float;
varying vec3 vSky;uniform float uTime;uniform float uAurora;uniform float uPalette;uniform vec3 uMoon;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.55+noise(p*2.01)*.27+noise(p*4.03)*.13+noise(p*8.07)*.05;}
void main(){vec3 rd=normalize(vSky);float el=max(rd.y,0.);vec3 col=mix(vec3(.012,.028,.058),vec3(.0025,.006,.020),pow(el,.48));
float az=atan(rd.x,-rd.z);
// Continuous atmospheric scattering, with no opaque horizon mask.
col+=vec3(.005,.012,.024)*exp(-el*9.);
// Small irregular star fields in spherical coordinates.
vec2 starUV=vec2(az,asin(clamp(rd.y,-1.,1.)));vec2 grid=starUV*vec2(330.,300.);vec2 cell=floor(grid);vec2 starP=vec2(hash(cell+1.3),hash(cell+7.1));float star=exp(-length(fract(grid)-starP)*38.)*step(.982,hash(cell));float twinkle=.7+.3*sin(uTime*.7+hash(cell+3.)*28.);col+=vec3(.68,.8,1.)*star*twinkle*smoothstep(.03,.18,rd.y)*2.2;
// A softly glowing moon with procedural maria and crater shading.
float moonDist=length(rd-uMoon);float disc=1.-smoothstep(.035,.0365,moonDist);vec3 tangent=normalize(cross(uMoon,vec3(0.,1.,0.))),bitan=cross(tangent,uMoon);vec2 muv=vec2(dot(rd,tangent),dot(rd,bitan))/.036;float maria=fbm(muv*4.+8.);float craters=noise(muv*22.)*.08;float limb=sqrt(max(0.,1.-dot(muv,muv)));vec3 moonCol=vec3(.78,.87,1.)*(.65+maria*.25+craters)*(.7+.3*limb);col+=vec3(.16,.25,.43)*exp(-moonDist*14.)*.3;col=mix(col,moonCol,disc);
// Continuous, positive emission integrated through overlapping folded curtains.
// Broad sampling kernels and per-pixel stratification prevent horizontal slicing.
vec3 aur=vec3(0.);
if(rd.y>.012){
 float jitter=hash(gl_FragCoord.xy)*.65;
 for(int i=0;i<56;i++){
  float layer=(float(i)+.175+jitter)/56.;
  float altitude=12.+layer*44.;
  vec2 p=rd.xz*(altitude/max(rd.y,.012))*.025;
  float drift=uTime*.024;
  float fold=1.14*sin(p.x*1.17+drift)+.36*sin(p.x*3.1-drift*.65);
  fold+=(noise(vec2(p.x*.72,uTime*.018))-.5)*.65;
  float edgeA=p.y+2.45+fold;
  float edgeB=p.y+4.85+.86*sin(p.x*.66-drift*.7)+fold*.3;
  float broadA=exp(-edgeA*edgeA*12.5);
  float broadB=exp(-edgeB*edgeB*11.);
  float filaments=.56+.44*noise(vec2(p.x*12.+drift*.45,p.y*.09+uTime*.012));
  float pulse=.65+.35*noise(vec2(p.x*2.-drift,3.7));
  float base=smoothstep(0.,.075,layer);
  float top=1.-smoothstep(.38,1.,layer);
  float heightGlow=base*top*exp(-layer*1.25);
  float density=(broadA+ broadB*.32)*filaments*pulse*heightGlow;
  vec3 green=vec3(.045,.83,.31);
  vec3 blue=vec3(.04,.39,.58);
  vec3 violet=vec3(.42,.12,.59);
  vec3 tint=mix(green,blue,smoothstep(.1,.65,layer));
  tint=mix(tint,violet,smoothstep(.32,.94,layer)*.85);
  tint=mix(tint,vec3(.30,.27,.70),uPalette*.37);
  aur+=tint*density*.044;
 }
}
col+=aur*uAurora*smoothstep(.012,.045,rd.y)*(1.-disc);
gl_FragColor=vec4(col,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
export const windGLSL=`uniform float uTime;uniform float uWind;vec3 windPosition(vec3 p){float h=max(0.,p.y)/7.8;float slow=sin(uTime*.73+p.y*.36)+.35*sin(uTime*1.31+p.y*.72);float bend=h*h*uWind;float r=length(p.xz);p.x+=slow*bend*.22;p.z+=cos(uTime*.54+p.y*.41)*bend*.12;float flutter=sin(uTime*2.1+p.x*2.5+p.z*1.8+p.y)*.65+sin(uTime*4.5+p.z*7.+p.y*5.)*.2;p.y+=flutter*uWind*r*.017;return p;}`;
