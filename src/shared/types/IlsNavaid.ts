import { Coordinates, Degrees, DegreesMagnetic, Feet } from 'msfs-geo';
import { DatabaseItem, FixType, KiloHertz, LsCategory } from './Common';

export interface IlsNavaid extends DatabaseItem {
    fixType: FixType.IlsNavaid,

    frequency: KiloHertz;
    category: LsCategory;
    runwayIdent: string;
    /**
     * The Location of the localizer
     */
    location: Coordinates;
    /**
     * The magnetic bearing of the localizer
     */
    bearing: DegreesMagnetic;
    gsLocation?: Coordinates & { alt?: Feet };
    gsSlope?: Degrees;
    /**
     * Beware: this is NOT the same as magnetic variation
     */
    stationDeclination: Degrees;
}
