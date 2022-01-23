import { Coordinates, NauticalMiles } from 'msfs-geo';
import {
    Airport,
    Level,
    Approach,
    Arrival,
    Departure,
    Runway,
    Airway,
    IlsNavaid,
    NdbNavaid,
    NdbClass,
    Marker,
    ProcedureLeg,
    VhfNavaid,
    VhfNavaidType,
    VorClass,
    Waypoint,
    DatabaseIdent,
    DataInterface,
    RestrictiveAirspace, ProcedureType,
} from '../shared';
import { AirportCommunication } from '../shared/types/Communication';
import { ControlledAirspace } from '../shared/types/Airspace';

export class Database {
    backend: DataInterface;

    constructor(backend: DataInterface) {
        this.backend = backend;
    }

    public getDatabaseIdent(): Promise<DatabaseIdent> {
        return this.backend.getDatabaseIdent();
    }

    public getAirports(idents: string[]): Promise<Airport[]> {
        return this.backend.getAirports(idents);
    }

    public async getRunways(airportIdentifier: string, procedure?: Departure | Arrival): Promise<Runway[]> {
        let runways = await this.backend.getRunways(airportIdentifier);
        if (procedure) {
            runways = runways.filter((runway) => procedure.runwayTransitions.find((trans) => trans.ident === runway.ident));
        }
        return runways;
    }

    public async getDepartures(airportIdentifier: string, idents: string[]): Promise<Departure[]> {
        return this.backend.getDepartures(airportIdentifier, idents);
    }

    public async getArrivals(airportIdentifier: string, idents: string[]): Promise<Arrival[]> {
        return this.backend.getArrivals(airportIdentifier, idents);
    }

    public async getApproaches(airportIdentifier: string, idents: string[]): Promise<Approach[]> {
        return this.backend.getApproaches(airportIdentifier, idents);
    }

    public async getProcedureSummary(airportIdentifier: string, type: ProcedureType, runways?: string[]): Promise<string[]> {
        return this.backend.getProcedureSummary(airportIdentifier, type, runways);
    }

    public async getHolds(fixIdentifier: string, airportIdentifier: string): Promise<ProcedureLeg[]> {
        return (await this.backend.getHolds(airportIdentifier)).filter((hold) => hold.ident === fixIdentifier);
    }

    public getIlsAtAirport(airportIdentifier: string): Promise<IlsNavaid[]> {
        return this.backend.getIlsAtAirport(airportIdentifier);
    }

    public getLsMarkers(airportIdentifier: string, runwayIdentifier: string, llzIdentifier: string): Promise<Marker[]> {
        return this.backend.getLsMarkers(airportIdentifier, runwayIdentifier, llzIdentifier);
    }

    public getNDBsAtAirport(airportIdentifier: string): Promise<NdbNavaid[]> {
        return this.backend.getNdbsAtAirport(airportIdentifier);
    }

    public getWaypointsAtAirport(airportIdentifier: string): Promise<Waypoint[]> {
        return this.backend.getWaypointsAtAirport(airportIdentifier);
    }

    getCommunicationsAtAirport(airportIdentifier: string): Promise<AirportCommunication[]> {
        return this.backend.getCommunicationsAtAirport(airportIdentifier);
    }

    public getWaypoints(idents: string[]): Promise<Waypoint[]> {
        return this.backend.getWaypoints(idents);
    }

    public getNavaids(idents: string[]): Promise<VhfNavaid[]> {
        return this.backend.getVhfNavaids(idents);
    }

    public getNDBs(idents: string[]): Promise<NdbNavaid[]> {
        return this.backend.getNdbNavaids(idents);
    }

    public async getAirways(idents: string[]): Promise<Airway[]> {
        return this.backend.getAirways(idents);
    }

    public async getAirwaysByFix(fix: Waypoint | NdbNavaid | VhfNavaid): Promise<Airway[]> {
        return this.backend.getAirwaysByFix(fix.ident, fix.icaoCode);
    }

    public getNearbyAirports(center: Coordinates, range: number): Promise<Airport[]> {
        return this.backend.getNearbyAirports(center, range);
    }

    public getNearbyAirways(center: Coordinates, range: number, levels?: Level): Promise<Airway[]> {
        return this.backend.getNearbyAirways(center, range, levels);
    }

    public getNearbyVhfNavaids(center: Coordinates, range: number, classes?: VorClass, types?: VhfNavaidType): Promise<VhfNavaid[]> {
        return this.backend.getNearbyVhfNavaids(center, range, classes, types);
    }

    public getNearbyNdbNavaids(center: Coordinates, range: number, classes?: NdbClass): Promise<NdbNavaid[]> {
        return this.backend.getNearbyNdbNavaids(center, range, classes);
    }

    public getWaypointsInRange(center: Coordinates, range: number): Promise<Waypoint[]> {
        return this.backend.getNearbyWaypoints(center, range);
    }

    public getControlledAirspacesInRange(center: Coordinates, range: NauticalMiles): Promise<ControlledAirspace[]> {
        return this.backend.getControlledAirspaceInRange(center, range);
    }

    public getRestrictiveAirspacesInRange(center: Coordinates, range: NauticalMiles): Promise<RestrictiveAirspace[]> {
        return this.backend.getRestrictiveAirspaceInRange(center, range);
    }

    // TODO this doesn't belong here (backend/provider specific)
    /** Returns the identifier of the runway attached to the approach, null if it is not specific to any runway */
    public static approachToRunway(ident: string): string | null {
        if (!ident.match(/\d+/g)) return null;
        switch (ident[3]) {
        case 'L':
        case 'C':
        case 'R':
            return (`RW${ident.substr(1, 3)}`);
        default:
            return (`RW${ident.substr(1, 2)}`);
        }
    }
}
