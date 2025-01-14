import { Coordinates, NauticalMiles } from 'msfs-geo';
import {
    Airport,
    Airway,
    AirwayLevel,
    Approach,
    Arrival,
    Departure,
    Runway,
    DatabaseIdent,
    IlsNavaid,
    Marker,
    NdbClass,
    NdbNavaid,
    ProcedureLeg,
    RunwaySurfaceType,
    VhfNavaid,
    VhfNavaidType,
    VorClass,
    Waypoint,
    DataInterface,
    RestrictiveAirspace,
} from '../../shared';
import { AirportCommunication } from '../../shared/types/Communication';
import { ControlledAirspace } from '../../shared/types/Airspace';
import { Gate } from '../../shared/types/Gate';

export class ExternalBackend implements DataInterface {
    private readonly apiBase: string;

    /**
     *
     * @param apiBase base URL for the
     */
    constructor(apiBase: string) {
        this.apiBase = apiBase;
    }

    async fetchApi(path: string): Promise<any> {
        const resp = fetch(`${this.apiBase}/${path}`);
        return (await resp).json();
    }

    getDatabaseIdent(): Promise<DatabaseIdent> {
        return this.fetchApi('');
    }

    getAirports(idents: string[]): Promise<Airport[]> {
        return this.fetchApi(`airports/${idents.join()}`);
    }

    getRunways(airportIdentifier: string): Promise<Runway[]> {
        return this.fetchApi(`airport/${airportIdentifier}/runways`);
    }

    getDepartures(airportIdentifier: string): Promise<Departure[]> {
        return this.fetchApi(`airport/${airportIdentifier}/departures`);
    }

    getArrivals(airportIdentifier: string): Promise<Arrival[]> {
        return this.fetchApi(`airport/${airportIdentifier}/arrivals`);
    }

    getApproaches(airportIdentifier: string): Promise<Approach[]> {
        return this.fetchApi(`airport/${airportIdentifier}/approaches`);
    }

    getGates(airportIdentifier: string): Promise<Gate[]> {
        return this.fetchApi(`airport/${airportIdentifier}/gates`);
    }

    getHolds(airportIdentifier: string): Promise<ProcedureLeg[]> {
        return this.fetchApi(`airport/${airportIdentifier}/holds`);
    }

    getAirways(idents: string[]): Promise<Airway[]> {
        return this.fetchApi(`airways/${idents.join()}`);
    }

    getAirwaysByFix(ident: string, icaoCode: string): Promise<Airway[]> {
        return this.fetchApi(`fix/${ident}/${icaoCode}/airways`);
    }

    getNdbsAtAirport(airportIdentifier: string): Promise<NdbNavaid[]> {
        return this.fetchApi(`airport/${airportIdentifier}/ndbs`);
    }

    getWaypointsAtAirport(airportIdentifier: string): Promise<Waypoint[]> {
        return this.fetchApi(`airport/${airportIdentifier}/waypoints`);
    }

    getIlsAtAirport(airportIdentifier: string): Promise<IlsNavaid[]> {
        return this.fetchApi(`airport/${airportIdentifier}/ils`);
    }

    getLsMarkers(airportIdentifier: string, runwayIdentifier: string, lsIdentifier: string): Promise<Marker[]> {
        return this.fetchApi(`airport/${airportIdentifier}/ls/${lsIdentifier}/markers/${runwayIdentifier}`);
    }

    getCommunicationsAtAirport(airportIdentifier: string): Promise<AirportCommunication[]> {
        return this.fetchApi(`airport/${airportIdentifier}/communications`);
    }

    getVhfNavaids(idents: string[], ppos?: Coordinates, icaoCode?: string, airportIdent?: string): Promise<VhfNavaid[]> {
        return this.fetchApi(`vhfnavaids/${idents.join()}${this.formatQuery({ ppos, icaoCode, airport: airportIdent })}`);
    }

    getNdbNavaids(idents: string[], ppos?: Coordinates, icaoCode?: string, airportIdent?: string): Promise<NdbNavaid[]> {
        return this.fetchApi(`ndbnavaids/${idents.join()}${this.formatQuery({ ppos, icaoCode, airport: airportIdent })}`);
    }

    getWaypoints(idents: string[], ppos?: Coordinates, icaoCode?: string, airportIdent?: string): Promise<Waypoint[]> {
        return this.fetchApi(`waypoints/${idents.join()}${this.formatQuery({ ppos, icaoCode, airport: airportIdent })}`);
    }

    getNearbyAirports(center: Coordinates, range: NauticalMiles, limit?: number, longestRunwaySurfaces?: RunwaySurfaceType): Promise<Airport[]> {
        return this.fetchApi(`nearby/airports/${center.lat},${center.long}/${range}${this.formatQuery({ limit, longestRunwaySurfaces })}`);
    }

    getNearbyAirways(center: Coordinates, range: NauticalMiles, limit?: number, levels?: AirwayLevel): Promise<Airway[]> {
        return this.fetchApi(`nearby/airways/${center.lat},${center.long}/${range}${this.formatQuery({ limit, levels })}`);
    }

    getNearbyVhfNavaids(center: Coordinates, range?: number, limit?: number, classes?: VorClass, types?: VhfNavaidType): Promise<VhfNavaid[]> {
        return this.fetchApi(`nearby/vhfnavaids/${center.lat},${center.long}/${range}${this.formatQuery({ limit, classes, types })}`);
    }

    getNearbyNdbNavaids(center: Coordinates, range?: number, limit?: number, classes?: NdbClass): Promise<NdbNavaid[]> {
        return this.fetchApi(`nearby/ndbnavaids/${center.lat},${center.long}/${range}${this.formatQuery({ limit, classes })}`);
    }

    getNearbyWaypoints(center: Coordinates, range?: number, limit?: number): Promise<Waypoint[]> {
        return this.fetchApi(`nearby/waypoints/${center.lat},${center.long}/${range}`);
    }

    private formatQuery(queries: Record<string, any>): string {
        const query = [];
        for (const prop in queries) {
            if (Object.prototype.hasOwnProperty.call(queries, prop) && queries[prop] !== undefined) {
                if (queries[prop] instanceof Array) {
                    query.push(`${prop}=${queries[prop].join()}`);
                } else {
                    query.push(`${prop}=${queries[prop]}`);
                }
            }
        }
        return query.length > 0 ? `?${query.join('&')}` : '';
    }

    getControlledAirspaceInRange(center: Coordinates, range: NauticalMiles): Promise<ControlledAirspace[]> {
        return this.fetchApi(`nearby/airspaces/controlled/${center.lat},${center.long}/${range}/`);
    }

    getRestrictiveAirspaceInRange(center: Coordinates, range: NauticalMiles): Promise<RestrictiveAirspace[]> {
        return this.fetchApi(`nearby/airspaces/restrictive/${center.lat},${center.long}/${range}/`);
    }
}
