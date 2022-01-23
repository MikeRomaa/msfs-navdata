import { Coordinates, Feet } from 'msfs-geo';
import { ProcedureLeg } from './ProcedureLeg';
import { Airport } from './Airport';
import { NdbNavaid } from './NdbNavaid';
import { Runway } from './Runway';
import { VhfNavaid } from './VhfNavaid';
import { Waypoint } from './Waypoint';
import { GlsNavaid } from './GlsNavaid';
import { IlsNavaid } from './IlsNavaid';

export type FeetPerMinute = number;
export type FlightLevel = number;
export type KiloHertz = number;
export type Knots = number;
export type MegaHertz = number;
export type Minutes = number;

export interface DatabaseItem {
    /**
     * Globally unique ID
     * Should _not_ be used for any purpose other than comparing equality
     * between objects from the nav database (i.e. check if your tuned VOR is the same as a waypoint)
     */
    databaseId: string,
    /**
     * ICAO region code (2 letter)
     */
    icaoCode: string,
    ident: string,
}

export interface ElevatedCoordinates extends Coordinates {
    alt: Feet,
}

export enum LsCategory {
    None,
    LocOnly,
    Category1,
    Category2,
    Category3,
    IgsOnly,
    LdaGlideslope,
    LdaOnly,
    SdfGlideslope,
    SdfOnly,
}

export interface ProcedureTransition {
    ident: string,
    legs: ProcedureLeg[],
}

export enum FixType {
    Airport,
    GlsNavaid,
    IlsNavaid,
    NdbNavaid,
    Runway,
    VhfNavaid,
    Waypoint,
}

export type Navaid = GlsNavaid | IlsNavaid | NdbNavaid | VhfNavaid;

export type Fix = Airport | NdbNavaid | Runway | VhfNavaid | Waypoint;

export enum Level {
    Both = 1 << 0,
    High = 1 << 1,
    Low = 1 << 2,
}
