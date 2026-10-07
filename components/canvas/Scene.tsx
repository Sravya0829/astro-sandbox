"use client";

import { Canvas,useFrame,useThree } from "@react-three/fiber";
import { Html,Line,OrbitControls,Stars } from "@react-three/drei";
import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import CameraRig from "./CameraRig";
import { useCameraStore } from "./cameraStore";
import { usePhysicsWorker } from "./physics/client";
import { live,usePhysicsStore,type Body } from "./physics/store";
import { liveOrigin,originBody,scaleDistance,toPhysics,toScene } from "./sceneScale";
import { analyzeBlackHole } from "@/lib/science/black-hole";
import { analyzeStar } from "@/lib/science/stellar";
import { predictTrajectories } from "@/lib/simulation/predict";
import { SCENE_THEME } from "@/components/canvas/sceneTheme";

function PhysicsStepper({step}:{step:(delta:number)=>void}){useFrame((_,delta)=>step(delta));return null;}

function SelectionCamera(){const selectedId=usePhysicsStore(s=>s.selectedBodyId),focusRequest=usePhysicsStore(s=>s.focusRequest),setFocus=useCameraStore(s=>s.setFocus);useEffect(()=>{const bodies=usePhysicsStore.getState().liveBodies(),body=bodies.find(item=>item.id===selectedId);if(!body)return;setFocus(new THREE.Vector3(...toScene(body.positionAU,liveOrigin(bodies))),Math.max(4,body.renderRadius*7));},[focusRequest,selectedId,setFocus]);return null;}

function Creator({addBody,origin}:{addBody:(body:Body)=>void;origin:[number,number]}){
  const{camera,gl}=useThree();const[start,setStart]=useState<[number,number]|null>(null);const[pointer,setPointer]=useState<[number,number]|null>(null);
  const project=useCallback((x:number,y:number):[number,number]|null=>{const rect=gl.domElement.getBoundingClientRect(),ndc=new THREE.Vector2((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1),ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();ray.setFromCamera(ndc,camera);return ray.ray.intersectPlane(plane,hit)?[hit.x,hit.z]:null;},[camera,gl.domElement]);
  useEffect(()=>{const move=(event:PointerEvent)=>{const point=project(event.clientX,event.clientY);if(point)setPointer(point);};const click=(event:PointerEvent)=>{if(event.target!==gl.domElement)return;const scenePoint=project(event.clientX,event.clientY);if(!scenePoint)return;const physicsPoint=toPhysics(scenePoint,origin);if(!start){setStart(physicsPoint);return;}const velocity:[number,number]=[(physicsPoint[0]-start[0])*.06,(physicsPoint[1]-start[1])*.06];addBody({id:`custom-${crypto.randomUUID()}`,name:"New planet",category:"planet",massSolar:3e-6,radiusKm:6371,renderRadius:.32,positionAU:start,velocityAUPerDay:velocity,color:"#66ccff"});setStart(null);};window.addEventListener("pointermove",move);window.addEventListener("pointerdown",click);return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerdown",click);};},[addBody,gl.domElement,origin,project,start]);
  const startScene=start?toScene(start,origin):null;
  return <>{startScene&&<mesh position={startScene}><sphereGeometry args={[.16,16,16]}/><meshBasicMaterial color="white"/></mesh>}{startScene&&pointer&&<Line points={[new THREE.Vector3(...startScene),new THREE.Vector3(pointer[0],0,pointer[1])]} color="#ffffff" lineWidth={1}/>}<Html fullscreen style={{pointerEvents:"none"}}><div className="creator-hint">{start?"Move the pointer, then click to set velocity":"Click in the scene to place the planet"}</div></Html></>;
}

function OrbitGuide({body,origin}:{body:Body;origin:[number,number]}){const[radius]=useState(()=>scaleDistance(Math.hypot(body.positionAU[0]-origin[0],body.positionAU[1]-origin[1])));const points=useMemo(()=>Array.from({length:129},(_,index)=>{const angle=index/128*Math.PI*2;return new THREE.Vector3(Math.cos(angle)*radius,0,Math.sin(angle)*radius);}),[radius]);return radius>.2?<Line points={points} color={SCENE_THEME.orbitGuide} lineWidth={.6} transparent opacity={.55}/>:null;}

// Trail and velocity vector redraw every frame from the live state, without React re-renders.
function useLiveLine(capacity:number,color:string,opacity:number){
  return useMemo(()=>{const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(new Float32Array(capacity*3),3));geometry.setDrawRange(0,0);return new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity}));},[capacity,color,opacity]);
}
function writeLine(line:THREE.Line,points:Array<[number,number,number]>){const attribute=line.geometry.getAttribute("position") as THREE.BufferAttribute,count=Math.min(points.length,attribute.count);for(let index=0;index<count;index++)attribute.setXYZ(index,...points[index]);attribute.needsUpdate=true;line.geometry.setDrawRange(0,count);line.geometry.computeBoundingSphere();}

function Trail({id,color}:{id:string;color:string}){
  const line=useLiveLine(721,color,.42);useEffect(()=>()=>{line.geometry.dispose();(line.material as THREE.Material).dispose();},[line]);
  useFrame(()=>{const origin=liveOrigin(),points=(live.trails.get(id)??[]).map(point=>toScene(point,origin)),current=live.positions.get(id);if(current)points.push(toScene(current,origin));writeLine(line,points);});
  return <primitive object={line}/>;
}

function PredictedTrail({points,origin,color}:{points:Array<[number,number]>;origin:[number,number];color:string}){const scenePoints=useMemo(()=>points.map(point=>new THREE.Vector3(...toScene(point,origin))),[origin,points]);return scenePoints.length>1?<Line points={scenePoints} color={color} lineWidth={.7} dashed dashSize={.35} gapSize={.24} transparent opacity={.32}/>:null;}

function VelocityVector({id}:{id:string}){
  const line=useLiveLine(2,SCENE_THEME.velocity,.75);useEffect(()=>()=>{line.geometry.dispose();(line.material as THREE.Material).dispose();},[line]);
  useFrame(()=>{const position=live.positions.get(id),velocity=live.velocities.get(id);if(!position||!velocity)return;const origin=liveOrigin();writeLine(line,[toScene(position,origin),toScene([position[0]+velocity[0]*25,position[1]+velocity[1]*25],origin)]);});
  return <primitive object={line}/>;
}

function BlackHoleVisual({radius,selected}:{radius:number;selected:boolean}){const disk=useRef<THREE.Mesh>(null!);useFrame((_,delta)=>{if(disk.current)disk.current.rotation.z+=delta*.16;});return <>
  <mesh ref={disk} rotation={[Math.PI/2.4,0,0]}><ringGeometry args={[radius*1.28,radius*2.85,128,3]}/><meshBasicMaterial color="#ff9b4a" transparent opacity={.68} side={THREE.DoubleSide} blending={THREE.AdditiveBlending}/></mesh>
  <mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[radius*1.5,radius*.025,10,100]}/><meshBasicMaterial color={SCENE_THEME.photonRing} transparent opacity={selected?.9:.38}/></mesh>
  <mesh><sphereGeometry args={[radius*2.1,40,40]}/><meshBasicMaterial color={SCENE_THEME.horizonHalo} transparent opacity={selected?.055:.02} side={THREE.BackSide}/></mesh>
  {selected&&<Html transform position={[radius*2.2,radius*.7,0]} distanceFactor={8} style={{pointerEvents:"none"}}><div className="scene-science-label"><strong>Photon sphere</strong><span>1.5 × event horizon</span></div></Html>}
  </>}

function SceneScienceOverlay({body}:{body:Body}){if(body.category==="star"){const analysis=analyzeStar(body.massSolar,body.ageGyr,body.metallicity);return <Html transform position={[0,-body.renderRadius*1.5,0]} distanceFactor={8} style={{pointerEvents:"none"}}><div className="scene-science-label"><strong>{analysis.stage}</strong><span>Next: {analysis.nextStage}</span></div></Html>;}if(body.category==="blackHole"){const analysis=analyzeBlackHole(body.massSolar);return <Html transform position={[0,-body.renderRadius*1.65,0]} distanceFactor={8} style={{pointerEvents:"none"}}><div className="scene-science-label warm"><strong>Event horizon</strong><span>{analysis.schwarzschildRadiusKm.toFixed(1)} km calculated</span></div></Html>;}return null;}

function CelestialMesh({body,origin}:{body:Body;origin:[number,number]}){
  const group=useRef<THREE.Group>(null!);const select=usePhysicsStore(s=>s.selectBody),selected=usePhysicsStore(s=>s.selectedBodyId===body.id);const position=toScene(body.positionAU,origin);
  useFrame(()=>{const current=live.positions.get(body.id);if(current&&group.current)group.current.position.set(...toScene(current,liveOrigin()));});const isStar=body.category==="star",isBlackHole=body.category==="blackHole";
  const stellar=isStar?analyzeStar(body.massSolar,body.ageGyr,body.metallicity):null,displayColor=stellar?.visualColor??body.color,displayRadius=body.renderRadius*(stellar?.visualRadiusMultiplier??1);
  const material=useMemo(()=>new THREE.MeshStandardMaterial({color:displayColor,emissive:isStar?displayColor:"#000000",emissiveIntensity:isStar?1.15:0,roughness:.68,metalness:.05}),[displayColor,isStar]);
  return <group ref={group} position={position}>
    {isStar&&<pointLight color={displayColor} intensity={2.2} distance={90}/>} {isBlackHole&&<BlackHoleVisual radius={displayRadius} selected={selected}/>}
    <mesh onClick={(event)=>{event.stopPropagation();select(body.id);}} onPointerOver={()=>{document.body.style.cursor="pointer";}} onPointerOut={()=>{document.body.style.cursor="auto";}}>
      <sphereGeometry args={[displayRadius,40,40]}/><primitive object={material} attach="material"/>
    </mesh>
    {selected&&!isBlackHole&&<mesh><sphereGeometry args={[displayRadius*1.16,32,32]}/><meshBasicMaterial color={SCENE_THEME.selection} transparent opacity={.16} side={THREE.BackSide}/></mesh>}
    <Html transform position={[0,displayRadius+.3,0]} distanceFactor={8} style={{pointerEvents:"none"}}><div className={`body-label ${selected?"selected":""}`}>{body.name}</div></Html>
    {selected&&<SceneScienceOverlay body={body}/>}
  </group>;
}

export default function Scene({simSpeed=30,initialBodies,creatorMode=false,showTrails=true,showPredictions=true,showVelocity=false,showGrid=false,collisions="merge",onController}:{simSpeed?:number;initialBodies:Body[];creatorMode?:boolean;showTrails?:boolean;showPredictions?:boolean;showVelocity?:boolean;showGrid?:boolean;collisions?:"merge"|"none";onController?:(controller:{addBody:(body:Body)=>void;updateBody:(id:string,patch:Partial<Body>)=>void;removeBody:(id:string)=>void;reset:()=>void})=>void}){
  const controlsRef=useRef<OrbitControlsImpl>(null),select=usePhysicsStore(s=>s.selectBody),bodies=usePhysicsStore(s=>s.bodies),trajectoryRevision=usePhysicsStore(s=>s.trajectoryRevision);const predicted=useMemo(()=>{void trajectoryRevision;return predictTrajectories(usePhysicsStore.getState().bodies);},[trajectoryRevision]);const{step,addBody,updateBody,removeBody,reset}=usePhysicsWorker({initialBodies,simSpeed,collisions});const setHome=useCameraStore(s=>s.setHome);
  useEffect(()=>{setHome();},[initialBodies,setHome]);
  useEffect(()=>{onController?.({addBody,updateBody,removeBody,reset});},[addBody,onController,removeBody,reset,updateBody]);
  const primary=originBody(bodies),origin=primary?.positionAU??[0,0];
  return <Canvas camera={{position:[0,6,26],fov:60}} dpr={[1,2]} onPointerMissed={()=>select(null)}>
    <color attach="background" args={[SCENE_THEME.background]}/><fog attach="fog" args={[SCENE_THEME.background,55,150]}/><PhysicsStepper step={step}/><SelectionCamera/>{creatorMode&&<Creator addBody={addBody} origin={origin}/>}<Stars radius={180} depth={60} count={2600} factor={3} fade/><ambientLight intensity={.18}/><directionalLight position={[3,5,2]} intensity={.7}/>{showGrid&&<gridHelper args={[120,60,SCENE_THEME.gridMajor,SCENE_THEME.gridMinor]}/>}
    {bodies.filter(body=>body.id!==primary?.id).map(body=><OrbitGuide key={`orbit-${body.id}`} body={body} origin={origin}/>)}
    {showTrails&&bodies.map(body=><Trail key={`trail-${body.id}`} id={body.id} color={body.color}/>)}
    {showPredictions&&bodies.map(body=><PredictedTrail key={`prediction-${body.id}`} points={predicted[body.id]??[]} origin={origin} color={body.color}/>)}
    {showVelocity&&bodies.map(body=><VelocityVector key={`velocity-${body.id}`} id={body.id}/>)}
    {bodies.map(body=><CelestialMesh key={body.id} body={body} origin={origin}/>) }
    <OrbitControls ref={controlsRef as React.Ref<OrbitControlsImpl>} enableDamping dampingFactor={.08} enablePan enableRotate enableZoom zoomToCursor minDistance={2.5} maxDistance={150} screenSpacePanning enabled={!creatorMode}/><CameraRig controls={controlsRef.current}/>
  </Canvas>;
}
