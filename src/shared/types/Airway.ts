import { Feet, NauticalMiles } from 'msfs-geo';
import { EnRouteFix, Level } from './Common';

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
    fixes: EnRouteFix[],
    turnRadius?: NauticalMiles,
    rnp?: NauticalMiles,
    direction: AirwayDirection,
    minimumAltitudeForward?: Feet,
    minimumAltitudeBackward?: Feet,
    maximumAltitude?: Feet,
}
