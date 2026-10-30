const GROUPS=[
  {key:'color',label:'01 · Colour',values:[['red','🔴','Red'],['blue','🔵','Blue'],['amber','🟡','Amber']]},
  {key:'shape',label:'02 · Shape',values:[['circle','⚪','Circle'],['triangle','🔺','Triangle'],['square','⬜','Square']]},
  {key:'pulses',label:'03 · Pulses',values:[[1,'1️⃣','One'],[2,'2️⃣','Two'],[3,'3️⃣','Three']]},
];
export const signalEmoji=signal=>GROUPS.map(group=>group.values.find(v=>v[0]===signal[group.key])?.[1]||'?').join(' ');

export class EmojiKeyboard {
  constructor(root,{onChange=()=>{},onSubmit=()=>{}}={}){
    this.value={color:'blue',shape:'circle',pulses:2};this.buttons=[];this.onChange=onChange;this.root=root;
    root.classList.add('emoji-keyboard');root.setAttribute('aria-label','Emoji signal keyboard');
    for(const group of GROUPS){
      const field=document.createElement('fieldset'),legend=document.createElement('legend'),keys=document.createElement('div');legend.textContent=group.label;keys.className='emoji-keys';field.append(legend,keys);root.append(field);
      group.values.forEach(([value,emoji,label],index)=>{
        const button=document.createElement('button');button.type='button';button.className='emoji-key';button.setAttribute('aria-label',`${group.key}: ${label}`);
        const glyph=document.createElement('span'),caption=document.createElement('small');glyph.textContent=emoji;glyph.setAttribute('aria-hidden','true');caption.textContent=label;button.append(glyph,caption);
        const choose=()=>{this.value[group.key]=value;this.render();onChange({...this.value});};button.addEventListener('click',choose);
        button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const offset=['ArrowRight','ArrowDown'].includes(event.key)?1:-1;keys.children[(index+offset+3)%3].focus();keys.children[(index+offset+3)%3].click();}});
        this.buttons.push({button,key:group.key,value});keys.append(button);
      });
    }
    root.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();onSubmit({...this.value});}});
    this.render();
  }
  render(){for(const item of this.buttons){const selected=this.value[item.key]===item.value;item.button.setAttribute('aria-pressed',String(selected));item.button.tabIndex=selected?0:-1;}}
  setDisabled(disabled){for(const {button}of this.buttons)button.disabled=disabled;}
}
