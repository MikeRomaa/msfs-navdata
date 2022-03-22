import { Coordinates, NauticalMiles } from 'msfs-geo';
import {
    Airport,
    Airway,
    Approach,
    Arrival,
    DatabaseIdent,
    DataInterface,
    Departure,
    IlsNavaid,
    Marker,
    ProcedureLeg,
    Level,
    NdbClass,
    NdbNavaid,
    ProcedureType,
    RestrictiveAirspace,
    Runway,
    RunwaySurfaceType,
    VhfNavaid,
    VhfNavaidType,
    VorClass,
    Waypoint,
} from '../../shared';
import { AirportCommunication } from '../../shared/types/Communication';
import { ControlledAirspace } from '../../shared/types/Airspace';

export class ExternalBackend implements DataInterface {
    /**
     *
     * @param apiBase base URL for the
     * @param fetch reference to fetch function to be used for calling api
     */
    constructor(
        private readonly apiBase: string,
        private readonly fetch: typeof globalThis.fetch,
    ) {
    }

    async fetchApi(path: string): Promise<any> {
        const resp = this.fetch(`${this.apiBase}/${path}`);
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

    getDepartures(airportIdentifier: string, idents: string[]): Promise<Departure[]> {
        return this.fetchApi(`airport/${airportIdentifier}/departures/${idents.join()}`);
    }

    getArrivals(airportIdentifier: string, idents: string[]): Promise<Arrival[]> {
        return this.fetchApi(`airport/${airportIdentifier}/arrivals/${idents.join()}`);
    }

    getApproaches(airportIdentifier: string, idents: string[]): Promise<Approach[]> {
        return this.fetchApi(`airport/${airportIdentifier}/approaches/${idents.join()}`);
    }

    getProcedureSummary(airportIdentifier: string, type: ProcedureType, runways?: string[]): Promise<string[]> {
        const prefix = `airport/${airportIdentifier}/`;
        switch (type) {
        default:
        case ProcedureType.Departure:
        case ProcedureType.Arrival:
            return this.fetchApi(
                `${prefix}${type === ProcedureType.Departure ? 'departures' : 'arrivals'}/summary${runways ? `?${runways.map((runway) => `runway=${runway}`).join('&')}` : ''}`,
            );
        case ProcedureType.Approach:
            return this.fetchApi(`${prefix}approaches/summary`);
        }
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

    getNearbyAirports(center: Coordinates, range: NauticalMiles, longestRunwaySurfaces?: RunwaySurfaceType): Promise<Airport[]> {
        return this.fetchApi(`nearby/airports/${center.lat},${center.long}/${range}${this.formatQuery({ longestRunwaySurfaces })}`);
    }

    getNearbyAirways(center: Coordinates, range: NauticalMiles, levels?: Level): Promise<Airway[]> {
        return this.fetchApi(`nearby/airways/${center.lat},${center.long}/${range}${this.formatQuery({ levels })}`);
    }

    getNearbyVhfNavaids(center: Coordinates, range?: number, classes?: VorClass, types?: VhfNavaidType): Promise<VhfNavaid[]> {
        return this.fetchApi(`nearby/vhfnavaids/${center.lat},${center.long}/${range}${this.formatQuery({ classes, types })}`);
    }

    getNearbyNdbNavaids(center: Coordinates, range?: number, classes?: NdbClass): Promise<NdbNavaid[]> {
        return this.fetchApi(`nearby/ndbnavaids/${center.lat},${center.long}/${range}${this.formatQuery({ classes })}`);
    }

    getNearbyWaypoints(center: Coordinates, range?: number): Promise<Waypoint[]> {
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
