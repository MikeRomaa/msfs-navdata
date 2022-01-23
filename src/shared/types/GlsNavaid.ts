import { Degrees, DegreesMagnetic } from 'msfs-geo';
import { DatabaseItem, ElevatedCoordinates, FixType, LsCategory } from './Common';

export interface GlsNavaid extends DatabaseItem {
    fixType: FixType.GlsNavaid,

    channel: number;
    category: LsCategory;
    runwayIdent: string;
    location: ElevatedCoordinates;
    bearing: DegreesMagnetic;
    slope: Degrees;
    type: GlsType;
}

export enum GlsType {
    Unknown,
    LaasGls,
    Scat1,
}
