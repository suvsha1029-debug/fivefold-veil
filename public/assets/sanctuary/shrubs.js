import * as T from './vendor/three.module.js';
// Low, spreading juniper; rounded dwarf willow; heather flower spikes.
// Stylized alpine/Arctic planting, built as shared geometry and instanced patches.
export function addAlpineGarden(scene,groundY,uniforms,snowMat,snowObjects){
 let seed=1017;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),up=V(0,1,0);
 function prototype(type){const p=[],n=[],c=[];function vertex(v,no,col){p.push(...v);n.push(...no);c.push(...col);}
 function leaf(base,dir,len,width,col){let d=dir.clone().normalize(),side=V().crossVectors(d,up).normalize();if(side.length()<.1)side=V(1,0,0);let normal=V().crossVectors(side,d).normalize();if(normal.y<0)normal.negate();let tip=base.clone().addScaledVector(d,len),mid=base.clone().addScaledVector(d,len*.48),l=mid.clone().addScaledVector(side,width),r=mid.clone().addScaledVector(side,-width),ridge=mid.clone().addScaledVector(normal,width*.18);for(let tri of [[base,l,ridge],[l,tip,ridge],[tip,r,ridge],[r,base,ridge]])for(let v of tri)vertex(v,normal,col);}
 function stem(a,b,r){let axis=b.clone().sub(a).normalize(),u=V().crossVectors(axis,V(0,0,1)).normalize(),v=V().crossVectors(axis,u);for(let k=0;k<4;k++){let t=k*Math.PI/2,tt=t+Math.PI/2,n1=u.clone().multiplyScalar(Math.cos(t)).addScaledVector(v,Math.sin(t)),n2=u.clone().multiplyScalar(Math.cos(tt)).addScaledVector(v,Math.sin(tt));let a1=a.clone().addScaledVector(n1,r),a2=a.clone().addScaledVector(n2,r),b1=b.clone().addScaledVector(n1,r*.25),b2=b.clone().addScaledVector(n2,r*.25);for(let [vv,nn] of [[a1,n1],[b1,n1],[a2,n2],[a2,n2],[b1,n1],[b2,n2]])vertex(vv,nn,[.13,.075,.055]);}}
 let count=type===0?15:type===1?11:21;
 for(let j=0;j<count;j++){
  let angle=j*2.399+rand()*.35,rad=V(Math.cos(angle),0,Math.sin(angle)),height=type===0?.15+rand()*.24:type===1?.35+rand()*.43:.20+rand()*.35;
  let reach=type===0?.45+rand()*.35:.18+rand()*.38,end=rad.clone().multiplyScalar(reach);end.y=height;let base=V(0,.02,0);stem(base,end,.012);
  let sub=type===0?8:type===1?5:3;
  for(let k=0;k<sub;k++){let f=.16+k/sub*.8,root=base.clone().lerp(end,f),side=V(-rad.z,0,rad.x).multiplyScalar(k%2?1:-1),twig=root.clone().addScaledVector(side,(type===0?.24:.16)*(1-f*.4)).addScaledVector(rad,.12);twig.y+=type===0?.06:.14;stem(root,twig,.005);let axis=twig.clone().sub(root),along=axis.clone().normalize();
   if(type===0){for(let m=0;m<15;m++){let origin=root.clone().addScaledVector(axis,m/15);for(let sign of [-1,1]){let d=side.clone().multiplyScalar(sign*.8).addScaledVector(along,.35);d.y+=.2;let shade=.7+rand()*.5;leaf(origin,d,.065+rand()*.025,.0045,[.065*shade,.17*shade,.14*shade]);}}}
   else if(type===1){for(let m=0;m<7;m++){let origin=root.clone().addScaledVector(axis,m/7),d=side.clone().multiplyScalar(m%2?1:-1).addScaledVector(along,.2);d.y+=.35;let shade=.8+rand()*.5;leaf(origin,d,.10+rand()*.025,.034,[.12*shade,.22*shade,.145*shade]);}}
   else {for(let m=0;m<6;m++){let origin=root.clone().addScaledVector(axis,m/6),d=V(Math.cos(m*2.4),.5,Math.sin(m*2.4));leaf(origin,d,.055,.009,[.12,.15,.11]);}for(let m=0;m<4;m++){let origin=twig.clone().add(V(0,m*.025,0));for(let q=0;q<4;q++)leaf(origin,V(Math.cos(q*1.57),.55,Math.sin(q*1.57)),.035,.015,[.30+rand()*.12,.21+rand()*.10,.38+rand()*.12]);}}
  }
 }
 let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.computeBoundingSphere();return g;}
 const mat=new T.MeshStandardMaterial({vertexColors:true,roughness:.86,side:T.DoubleSide});
 mat.onBeforeCompile=s=>{Object.assign(s.uniforms,{uTime:uniforms.time,uWind:uniforms.wind,uSnowCover:uniforms.snowCover});s.vertexShader='uniform float uTime;uniform float uWind;varying vec3 vPlant;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPlant=position;transformed.x+=sin(uTime*1.3+position.z*7.+position.y*5.)*pow(max(position.y,0.),2.)*uWind*.075;');s.fragmentShader='uniform float uSnowCover;varying vec3 vPlant;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nfloat speckle=fract(sin(dot(floor(vPlant*38.),vec3(12.98,78.23,43.15)))*43758.5453);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.48,.62,.7),uSnowCover*smoothstep(.72,.96,speckle)*.7);`);};
 const placements=[[],[],[]];
 for(let i=0;i<90;i++){let z=-28+rand()*44,x=(rand()-.5)*31,path=Math.sin((z+3)*.145)*2.25;
  // Keep the path and pond open, with clusters along their banks.
  if(Math.abs(x-path)<2.25)x=path+(x>path?1:-1)*(2.3+rand()*1.4);
  if(Math.pow((x-5.8)/4.2,2)+Math.pow((z-2.8)/3.3,2)<1)x-=8;
  let kind=i%3,scale=.65+rand()*.8;placements[kind].push({x,z,scale,rot:rand()*6.28});
 }
 // Close foreground planting makes the low Arctic growth visible at the default camera.
 placements[0].push({x:-3.8,z:10,scale:1.6,rot:.4},{x:3.8,z:12,scale:1.35,rot:1.3});
 placements[1].push({x:-6,z:7,scale:1.35,rot:.7},{x:9,z:8,scale:1.25,rot:2.1});
 placements[2].push({x:-2.8,z:6,scale:1.3,rot:1},{x:3.2,z:8,scale:1.2,rot:2});
 let dummy=new T.Object3D(),caps=[];let geometries=[];
 for(let kind=0;kind<3;kind++){let geo=prototype(kind);geometries.push(geo);let inst=new T.InstancedMesh(geo,mat,placements[kind].length);placements[kind].forEach((p,i)=>{dummy.position.set(p.x,groundY(p.x,p.z),p.z);dummy.rotation.set(0,p.rot,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);for(let k=0;k<3;k++){let a=k*2.399+p.rot;caps.push({x:p.x+Math.cos(a)*.24*p.scale,z:p.z+Math.sin(a)*.24*p.scale,y:groundY(p.x,p.z)+(kind===0?.28:kind===1?.48:.29)*p.scale,s:p.scale*(kind===0?.34:.23)});}});inst.receiveShadow=true;scene.add(inst);}
 const snow=new T.InstancedMesh(new T.SphereGeometry(1,8,4),snowMat,caps.length);caps.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,i*2.399,0);dummy.scale.set(p.s,.065,p.s*.7);dummy.updateMatrix();snow.setMatrixAt(i,dummy.matrix);});snow.receiveShadow=true;scene.add(snow);snowObjects.push(snow);
 return {count:placements.reduce((n,a)=>n+a.length,0),geometries};
}
