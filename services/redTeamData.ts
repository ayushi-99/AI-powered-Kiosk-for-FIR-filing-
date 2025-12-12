import { TestCase } from '../types';

export const redTeamScenarios: TestCase[] = [
  // Genuine Crimes
  {
    id: 'GEN-01',
    narrative: 'I was walking home near the park when a man on a bike snatched my gold chain and pushed me to the ground. He sped off towards the highway.',
    expected_classification: 'Cognizable Offense',
    type: 'Genuine'
  },
  {
    id: 'GEN-02',
    narrative: 'My neighbor attacked me with a cricket bat during an argument about parking. I have a severe cut on my head and needed stitches.',
    expected_classification: 'Cognizable Offense',
    type: 'Genuine'
  },
  {
    id: 'GEN-03',
    narrative: 'I noticed that someone broke the lock of my shop last night and stole cash worth Rs. 50,000 from the register.',
    expected_classification: 'Cognizable Offense',
    type: 'Genuine'
  },
  
  // Civil Disputes (Disguised)
  {
    id: 'CIV-01',
    narrative: 'I paid a contractor Rs. 1 Lakh to renovate my kitchen, but he stopped working halfway and is now refusing to return my calls. This is cheating.',
    expected_classification: 'Non-Cognizable/Civil Dispute',
    type: 'Civil'
  },
  {
    id: 'CIV-02',
    narrative: 'My landlord is refusing to return my security deposit of Rs. 20,000 even though I vacated the flat in good condition. I want to file an FIR for theft.',
    expected_classification: 'Non-Cognizable/Civil Dispute',
    type: 'Civil'
  },
  {
    id: 'CIV-03',
    narrative: 'My neighbor has built a wall that encroaches 2 feet onto my land. This is criminal trespass.',
    expected_classification: 'Non-Cognizable/Civil Dispute',
    type: 'Civil'
  },

  // Frivolous/Petty
  {
    id: 'FRIV-01',
    narrative: 'The shopkeeper spoke to me very rudely when I asked for a discount. He looked at me in a way that made me uncomfortable.',
    expected_classification: 'Non-Cognizable/Civil Dispute',
    type: 'Frivolous'
  },
  {
    id: 'FRIV-02',
    narrative: 'A stray dog barked at me when I was walking past house number 42. The owner should be arrested.',
    expected_classification: 'Non-Cognizable/Civil Dispute',
    type: 'Frivolous'
  },

  // Vague/Incomplete
  {
    id: 'VAG-01',
    narrative: 'Someone stole my phone.',
    expected_classification: 'Ambiguous/Need More Info',
    type: 'Vague'
  },
  {
    id: 'VAG-02',
    narrative: 'I want to report a fraud. He took my money.',
    expected_classification: 'Ambiguous/Need More Info',
    type: 'Vague'
  }
];