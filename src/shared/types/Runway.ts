import { Degrees, DegreesMagnetic, DegreesTrue, Feet, Metres } from 'msfs-geo';
import {
    LsCategory,
    DatabaseItem,
    ElevatedCoordinates, FixType,
} from './Common';

export interface Runway extends DatabaseItem {
    fixType: FixType.Runway,

    airportIdent: string,
    bearing: DegreesTrue,
    magneticBearing: DegreesMagnetic,
    /**
     * slope of the runway, negative for downhill
     */
    gradient: Degrees,
    /**
     * Threshold location (including elevation)
     */
    location: ElevatedCoordinates,
    thresholdCrossingHeight: Feet,
    length: Metres,
    width: Metres,
    lsIdent: string,
    lsCategory: LsCategory,
    surfaceType?: RunwaySurfaceType,
}

export enum RunwaySurfaceType {
    Unknown = 1 << 0,
    Hard = 1 << 1,
    Soft = 1 << 2,
    Water = 1 << 3,
}
