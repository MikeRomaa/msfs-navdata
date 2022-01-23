import { Feet, NauticalMiles } from 'msfs-geo';
import { Waypoint } from './Waypoint';
import { Level } from './Common';
import { VhfNavaid } from './VhfNavaid';
import { Airport } from './Airport';
import { NdbNavaid } from './NdbNavaid';

export enum AirwayType {
    Airline,
    Control,
    Direct,
    Helicopter,
    Official,
    Rnav,
    Ats,
}

export enum AirwayDirection {
    Either,
    Forward,
    Backward,
}

export interface Airway {
    databaseId: string,
    ident: string,
    level: Level,
    fixes: (Airport | NdbNavaid | Waypoint | VhfNavaid)[],
    turnRadius?: NauticalMiles,
    rnp?: NauticalMiles,
    direction: AirwayDirection,
    minimumAltitudeForward?: Feet,
    minimumAltitudeBackward?: Feet,
    maximumAltitude?: Feet,
}
