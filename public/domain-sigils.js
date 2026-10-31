import { getDomain } from './domains.js';

/** Display copies of the six supplied PNGs. The originals are kept alongside them. */
export const DOMAIN_SIGILS=Object.freeze({
  taiga:{name:'Rimebranch',meaning:'A sheltered spark beneath the northern boughs.'},
  corrupted:{name:'Veiled Witness',meaning:'A watchful presence beneath a fractured sky.'},
  lunar:{name:'Silver Tide',meaning:'One moon, two currents, a shared reflection.'},
  fire:{name:'Ember Crown',meaning:'A flame carried upward through the terraces.'},
  frontier:{name:'Horizon Knot',meaning:'Ice, dune and summit joined at the horizon.'},
  'star-sea':{name:'Astral Compass',meaning:'A bearing for those beyond the last light.'},
});
export const sigilAsset=id=>`/assets/sigils/${getDomain(id).id}.webp`;
export function makeSigil(id,className=''){
  const image=document.createElement('img');
  image.className=`domain-sigil ${className}`;image.src=sigilAsset(id);
  image.alt='';image.setAttribute('aria-hidden','true');image.width=80;image.height=80;
  image.loading='lazy';image.decoding='async';return image;
}
